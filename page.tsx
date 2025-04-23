import { useFetcher } from "@remix-run/react";
import { IconUsersGroup } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useRef } from "react";
import { ListWithIcons } from "~/components/list";
import { formatServerDate } from "~/lib/date";
import { dataAtualAtom } from "../../atoms/data";
import { horarioAtualAtom } from "../../atoms/horarios";
import { localAtualAtom } from "../../atoms/locais";
import { observacaoAtom } from "../../atoms/observacao";
import { TarefasWrapper } from "../../components/tarefas";
import {
	useTarefaData,
	useTarefaEspacoComHorario,
	useTarefaObservacao,
} from "../padrao/tarefas";
import { useTarefaTermosCondicoes } from "./tarefas";

export function PageChurrasqueira() {
	const refs: Record<string, React.RefObject<HTMLDivElement>> = {
		passo1: useRef<HTMLDivElement>(null),
		passo2: useRef<HTMLDivElement>(null),
		passo3: useRef<HTMLDivElement>(null),
		passo4: useRef<HTMLDivElement>(null),
	};
	const fetcher = useFetcher();
	const localAtual = useAtomValue(localAtualAtom)!;
	const dataAtual = useAtomValue(dataAtualAtom)!;
	const horarioAtual = useAtomValue(horarioAtualAtom)!;
	const observacao = useAtomValue(observacaoAtom);

	return (
		<TarefasWrapper
			tarefas={[
				useTarefaData({
					// passo1
					refs,
				}),
				useTarefaEspacoComHorario({
					// passo2
					refs,
					customCardDescription: (local) => (
						<ListWithIcons
							items={[
								{
									icon: <IconUsersGroup />,
									name: "Capacidade",
									value: `${local.capacidade} convidados`,
								},
							]}
						/>
					),
				}),
				useTarefaTermosCondicoes({ refs }), //passo3
				useTarefaObservacao(), //passo4
			]}
			onFinalizar={() => {
				fetcher.submit(
					{
						tipoAgendamento: "CHURRASQUEIRA",
						agendamentoTipoId: horarioAtual.agendamentoTipoId,
						atividadeEspacoId: localAtual.atividadeEspacoId,
						data: formatServerDate(dataAtual),
						horarioInicio: horarioAtual.horarioInicio,
						horarioFim: horarioAtual.horarioFim,
						observacao,
					},
					{ method: "POST", encType: "application/json" },
				);
			}}
		/>
	);
}
