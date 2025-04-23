import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { IconArrowLeft, IconCalendarPlus } from "@tabler/icons-react";
import { useStore } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { Header } from "~/components/header";
import { SimpleIcon } from "~/components/icon";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { BASE_URL } from "~/lib/api";
import { ClientePayload, requireAuthentication } from "~/lib/auth.server";
import { ResponseManager } from "~/lib/response.server";
import { z } from "~/lib/zod";
import { postAgendar } from "~/services/agendamento";
import { getAtividade } from "~/services/atividade";
import { getLocais } from "~/services/atividadeEspaco";
import { getFamiliares } from "~/services/cliente";
import { getTipoAgendamento } from "~/utils/tipo-agendamento";
import { atividadeAtom } from "./atoms/atividade";
import { familiaresAtom } from "./atoms/familiares";
import { locaisAtom } from "./atoms/locais";
import { PageChurrasqueira } from "./pages/churrasqueira/page";
import { shouldLoad } from "./utils";

export async function loader({ request, params }: LoaderFunctionArgs) {
	const idAtividade = await z.coerce.number().parseAsync(params.idAtividade);

	const manager = new ResponseManager(request);

	const { token } = await requireAuthentication("cliente", manager);

	// ============================================================================================>

	fetch(`${BASE_URL}/api/atividade/${idAtividade}`);

	const {
		data: atividade,
		error: atividadeError,
		response: atividadeResponse,
	} = await getAtividade({ id: idAtividade, token });

	if (atividadeError || !atividadeResponse.ok) {
		return manager.sendRedirectWithToast("/", {
			type: "error",
			title: "Erro ao carregar atividade",
			description:
				atividadeError?.message || "Tente novamente mais tarde",
		});
	}

	const tipoAgendamento = getTipoAgendamento({
		atividade: atividade.nome,
		atividadeCategoria: atividade.atividadeCategoriaNome,
	});

	// ============================================================================================>

	let locais: Schema["AtividadeEspacoDTO"][] | undefined = undefined;

	if (shouldLoad.locais(tipoAgendamento.id)) {
		const {
			data,
			error: locaisError,
			response: locaisResponse,
		} = await getLocais({
			token,
			idAtividade,
		});

		if (locaisError || !locaisResponse.ok) {
			return manager.sendRedirectWithToast("/", {
				type: "error",
				title: "Erro ao carregar locais",
				description:
					locaisError?.message || "Tente novamente mais tarde",
			});
		}

		locais = data;
	}

	// ============================================================================================>

	let familiares: Schema["ClienteDTO"][] | undefined = undefined;

	if (shouldLoad.familiares(tipoAgendamento.id)) {
		const {
			data,
			error: familiaresError,
			response: familiaresResponse,
		} = await getFamiliares({ token });

		if (familiaresError || !familiaresResponse.ok) {
			return manager.sendRedirectWithToast("/", {
				type: "error",
				title: "Erro ao carregar familiares",
				description:
					familiaresError?.message || "Tente novamente mais tarde",
			});
		}

		familiares = data;
	}

	// ============================================================================================>

	return manager.sendJSON({
		atividade,
		tipoAgendamento,
		locais,
		familiares,
	});
}

export default function Page() {
	const { atividade, tipoAgendamento, locais, familiares } =
		useLoaderData<typeof loader>();

	const store = useStore();

	useHydrateAtoms(
		[
			[atividadeAtom, atividade],
			[familiaresAtom, familiares],
			[locaisAtom, locais],
		],
		{ store },
	);

	let Page;

	switch (tipoAgendamento.id) {
		case "CHURRASQUEIRA":
			Page = <PageChurrasqueira />;
			break;
	}

	return (
		<>
			<Card className="p-2">
				<Link
					to={`/agendar/categorias/${atividade.atividadeCategoriaId}`}
					replace
				>
					<Button variant="ghost">
						<IconArrowLeft /> Voltar
					</Button>
				</Link>
			</Card>
			<Header
				title={`${atividade.atividadeCategoriaNome} / ${atividade.nome}`}
				subtitle="Novo agendamento"
				icon={
					<SimpleIcon color="violet">
						<IconCalendarPlus />
					</SimpleIcon>
				}
			/>
			{Page}
		</>
	);
}

export async function action({ request }: ActionFunctionArgs) {
	const json = await request.json();

	// Deve ter o campo "tipoAgendamento" em toda action de agendamento
	const tipoAgendamento = await z.string().parseAsync(json.tipoAgendamento);

	const manager = new ResponseManager(request);

	const { token, payload } = await requireAuthentication("cliente", manager);

	switch (tipoAgendamento) {
		case "CHURRASQUEIRA":
			return actionChurrasqueira(manager, json, token, payload);
	}
}

async function actionChurrasqueira(
	manager: ResponseManager,
	json: unknown,
	token: string,
	payload: ClientePayload,
) {
	const schema = z.object({
		agendamentoTipoId: z.number(),
		atividadeEspacoId: z.number(),
		data: z.string(),
		horarioInicio: z.string(),
		horarioFim: z.string(),
		observacao: z.string(),
	});

	const { data: body, error } = await schema.safeParseAsync(json);

	if (error) {
		return manager.sendRedirectBackWithToast({
			type: "error",
			title: "Erro ao agendar",
			description: "Dados inválidos",
		});
	}

	const {
		data: agendamento,
		error: agendamentoError,
		response,
	} = await postAgendar({
		...body,
		clienteId: payload.ClienteId,
		token,
	});

	if (agendamentoError || !response.ok) {
		return manager.sendRedirectBackWithToast({
			type: "error",
			title: "Erro ao agendar",
			description:
				agendamentoError?.message || "Tente novamente mais tarde",
		});
	}

	return manager.sendRedirectWithToast(
		`/visualizar-agendamento/churrasqueira/${agendamento.agendamentoId}`,
		{
			type: "success",
			title: "Agendamento realizado!",
		},
	);
}
