import { Link, useParams } from "@remix-run/react";
import {
	IconCalendarEvent,
	IconClock,
	IconMapPin,
	IconPlus,
	IconTrash,
	IconUsersGroup,
} from "@tabler/icons-react";
import { add, sub } from "date-fns";
import { useAtom, useAtomValue } from "jotai";
import { ListOrdered } from "lucide-react";
import { Alert, AlertNenhumDadoEncontrado } from "~/components/alert";
import { CardSelectable } from "~/components/card";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Card } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { formatDate, formatServerDate } from "~/lib/date";
import { formatTime } from "~/lib/time";
import { atividadeAtom } from "../../atoms/atividade";
import { dataAtualAtom } from "../../atoms/data";
import { familiaresAtom } from "../../atoms/familiares";
import {
	horarioAtualAtom,
	horarioAtualAtomFilaEsperaAtom,
	horariosAtom,
	horariosFilaEsperaAtom,
	resetHorarioEffect,
} from "../../atoms/horarios";
import {
	locaisAtom,
	locaisComHorariosAtom,
	localAtualAtom,
} from "../../atoms/locais";
import { observacaoAtom } from "../../atoms/observacao";
import { participantesAtom } from "../../atoms/participantes";
import { HorariosListByPeriodo } from "../../components/horarios";
import {
	BuscarParticipantePorMatricula,
	ParticipanteCard,
} from "../../components/participantes";
import { Tarefa } from "../../components/tarefas";

const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
	setTimeout(() => {
		if (ref && "current" in ref && ref.current) {
			ref.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, 0);
};

function Locais({
	customCardDescription,
	refs,
}: {
	customCardDescription?: (
		local: Schema["AtividadeEspacoDTO"],
	) => React.ReactNode;
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}) {
	const locais = useAtomValue(locaisAtom);
	const [localAtual, setLocalAtual] = useAtom(localAtualAtom);

	if (locais?.length === 0) {
		return (
			<AlertNenhumDadoEncontrado description="Desculpe, mas nenhum local foi encontrado para essa atividade" />
		);
	}

	return (
		<div className="@container" ref={refs.passo1}>
			<div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
				{locais?.map((local) => (
					<CardSelectable
						buttonTestId="select-local"
						key={local.atividadeEspacoId}
						title={local.nome}
						img={local.imagem || "/img-clube.png"}
						onSelect={() => {
							setLocalAtual(local);
							scrollTo(refs.passo2!);
						}}
						selected={
							local.atividadeEspacoId ===
							localAtual?.atividadeEspacoId
						}
						description={customCardDescription?.(local)}
					/>
				))}
			</div>
		</div>
	);
}

export function useTarefaLocal({
	customCardDescription,
	refs,
}: {
	customCardDescription?: (
		local: Schema["AtividadeEspacoDTO"],
	) => React.ReactNode;
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}): Tarefa {
	const localAtual = useAtomValue(localAtualAtom);

	return {
		id: "local",
		name: "Local",
		description: "Escolha um local para realizar o agendamento",
		icon: <IconMapPin />,
		display: () => localAtual!.nome,
		isChecked: localAtual !== undefined,
		content: (
			<Locais refs={refs} customCardDescription={customCardDescription} />
		),
	};
}

function Data({
	maxDays,
	refs,
}: {
	maxDays?: number;
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}) {
	const atividade = useAtomValue(atividadeAtom);
	const [dataAtual, setDataAtual] = useAtom(dataAtualAtom);

	const disabled = (d: Date) =>
		d <= sub(new Date(), { days: 1 }) ||
		(maxDays !== undefined && d > add(new Date(), { days: maxDays - 1 })) ||
		(atividade?.dataTempoMaximoLiberacao != null &&
			d > new Date(atividade.dataTempoMaximoLiberacao));

	return (
		<div className="flex" ref={refs.passo2}>
			<Calendar
				mode="single"
				selected={dataAtual || undefined}
				onSelect={(d) => {
					scrollTo(refs.passo3 as React.RefObject<HTMLDivElement>);
					setDataAtual(d);
				}}
				disabled={disabled}
				className="rounded-lg border bg-background"
			/>
		</div>
	);
}

export function useTarefaData({
	maxDays,
	refs,
}: {
	maxDays?: number;
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}): Tarefa {
	const dataAtual = useAtomValue(dataAtualAtom);

	return {
		id: "data",
		name: "Data",
		description: "Escolha uma data para realizar o agendamento",
		icon: <IconCalendarEvent />,
		display: () => formatDate(dataAtual!),
		isChecked: dataAtual !== undefined,
		content: <Data refs={refs} maxDays={maxDays} />,
	};
}

export function useTarefaHorario({
	showMinMaxParticipantes = true,
	customBody,
	refs,
}: {
	showMinMaxParticipantes?: boolean;
	customBody?: React.ReactNode;
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}): Tarefa {
	useAtom(resetHorarioEffect);
	const {
		data: horarios,
		isPending,
		isError,
		error,
	} = useAtomValue(horariosAtom);
	const [horarioAtual, setHorarioAtual] = useAtom(horarioAtualAtom);
	const [horarioAtualFilaEspera, setHorarioAtualFilaEspera] = useAtom(
		horarioAtualAtomFilaEsperaAtom,
	);
	const pathname = useParams();

	let content: React.ReactNode;

	const isSelected = (h: Schema["AgendamentoHorarioDTO"]) => {
		return h.agendamentoHorarioId === horarioAtual?.agendamentoHorarioId;
	};

	if (isPending) {
		content = (
			<Alert
				title="Carregando horários..."
				variant="load"
				ref={refs.passo3}
			/>
		);
	} else if (isError) {
		content = (
			<Alert title="Erro ao carregar horários" variant="error">
				{error.message}
			</Alert>
		);
	} else if (!horarios) {
		content = (
			<Alert
				title="Preencha as tarefas anteriores primeiro"
				variant="warning"
			/>
		);
	} else if (horarios.length === 0) {
		content = (
			<AlertNenhumDadoEncontrado
				description={
					<>
						Desculpe, mas não há horários disponíveis nessa data.
						<br />É possível que o horário mínimo para liberação
						ainda não tenha sido atingido ou já foi agendado.
					</>
				}
			/>
		);
	} else {
		content = (
			<div className="flex flex-col gap-4" ref={refs.passo3}>
				{customBody}

				<HorariosListByPeriodo
					horarios={horarios}
					onSelect={(h) => {
						setHorarioAtual(h);
						setHorarioAtualFilaEspera(undefined);
						scrollTo(refs.passo4!);
					}}
					isSelected={isSelected}
					showMinMaxParticipantes={showMinMaxParticipantes}
				/>
			</div>
		);
	}

	const isChecked =
		horarioAtual !== undefined || horarioAtualFilaEspera !== undefined;

	return {
		id: "horario",
		name: "Horário",
		description: "Escolha um horário disponível para a data escolhida",
		icon: <IconClock />,
		display: () => {
			if (horarioAtual) {
				const inicio = formatTime(horarioAtual!.horarioInicio);
				const fim = formatTime(horarioAtual!.horarioFim);

				return `${inicio} - ${fim}`;
			}

			return "Selecionou um horário da fila de espera";
		},
		isChecked,
		content: (
			<div
				aria-checked={isChecked}
				aria-disabled={!horarios}
				className="space-y-2"
				ref={refs.passo3}
			>
				{pathname.idAtividade ==
					import.meta.env.VITE_ID_ATIVIDADE_CHURRASQUEIRA?.toString() && (
					<Alert variant="info" title="Sobre o cálculo de horários">
						<div className="flex flex-col gap-2">
							<p>
								{" "}
								<Link
									to="/termos-e-condicoes-churrasqueira.pdf"
									className="text-secondary underline"
									target="_blank"
								>
									Termos e Condições
								</Link>{" "}
								de uso da churrasqueira
							</p>
						</div>
					</Alert>
				)}

				{content}
			</div>
		),
	};
}

export function useTarefaEspacoComHorario({
	refs,
	customCardDescription,
}: {
	refs: Record<string, React.RefObject<HTMLDivElement>>;
	customCardDescription?: (
		local: Schema["AtividadeEspacoDTO"],
	) => React.ReactNode;
}): Tarefa {
	const dataAtual = useAtomValue(dataAtualAtom);
	const locaisQuery = useAtomValue(locaisComHorariosAtom);
	const [localAtual, setLocalAtual] = useAtom(localAtualAtom);
	const [horarioAtual, setHorarioAtual] = useAtom(horarioAtualAtom);

	const locais = locaisQuery.data;
	const isChecked =
		!!localAtual?.atividadeEspacoId && !!horarioAtual?.agendamentoHorarioId;

	return {
		id: "localHorario",
		name: "Local e horário",
		description: "Escolha o local e o horário desejado",
		icon: <IconClock />,
		isChecked: Boolean(isChecked),
		display: () =>
			localAtual && horarioAtual
				? `${localAtual.nome} • ${formatTime(horarioAtual.horarioInicio)} - ${formatTime(horarioAtual.horarioFim)}`
				: "Nenhum horário selecionado",
		content: (
			<div ref={refs.passo2}>
				{locaisQuery.isLoading ? (
					<div className="text-sm text-neutral-500">
						Carregando horários...
					</div>
				) : locaisQuery.isError ? (
					<AlertNenhumDadoEncontrado
						description={`Erro: ${locaisQuery.error.message}`}
					/>
				) : Array.isArray(locais) && locais.length > 0 ? (
					<div className="flex flex-col gap-4">
						{locais.map((local) => (
							<div
								key={local.atividadeEspacoId}
								className="flex flex-col space-y-4 rounded-lg border p-6"
							>
								<CardSelectable
									title={local.nome}
									img={local.imagem || "/img-clube.png"}
									onSelect={() => setLocalAtual(local)}
									selected={
										local.atividadeEspacoId ===
										localAtual?.atividadeEspacoId
									}
									description={customCardDescription?.(local)}
								/>
								<HorariosListByPeriodo
									horarios={local.horarios.filter(
										(horario) =>
											formatServerDate(dataAtual) ===
											formatServerDate(horario.data),
									)}
									onSelect={(h) => {
										setLocalAtual(local);
										setHorarioAtual(h);
										scrollTo(refs.passo3!);
									}}
									isSelected={(h) =>
										h.agendamentoHorarioId ===
										horarioAtual?.agendamentoHorarioId
									}
									showMinMaxParticipantes={true}
								/>
							</div>
						))}
					</div>
				) : (
					<AlertNenhumDadoEncontrado description="Nenhum espaço com horário disponível nessa data." />
				)}
			</div>
		),
	};
}

function Participantes({
	refs,
}: {
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}) {
	const [participantes, setParticipantes] = useAtom(participantesAtom);
	const familiares = useAtomValue(familiaresAtom);
	const horarioAtual = useAtomValue(horarioAtualAtom);
	const horarioAtualFilaEspera = useAtomValue(horarioAtualAtomFilaEsperaAtom);
	const atividade = useAtomValue(atividadeAtom);

	if (atividade?.atividadeId != import.meta.env.VITE_ID_ATIVIDADE_TENIS) {
		if (!horarioAtual) {
			return (
				<Alert
					title="Escolha um horário primeiro"
					variant="warning"
					ref={refs.passo4}
				/>
			);
		}

		const handleRemoveParticipante = (clienteId: number) => {
			setParticipantes((prev) =>
				prev.filter((p) => clienteId !== p.clienteId),
			);
		};

		return (
			<div className="flex flex-col gap-4" ref={refs.passo4}>
				{(participantes.length < horarioAtual.qtdMinimaCliente ||
					participantes.length > horarioAtual.qtdMaximaCliente) && (
					<Alert
						title={`${participantes.length} participante(s) adicionado(s)`}
						variant="info"
					>
						Para esse horário, é necessário adicionar no mínimo{" "}
						{horarioAtual.qtdMinimaCliente} e no máximo{" "}
						{horarioAtual.qtdMaximaCliente} participantes
					</Alert>
				)}
				{/* Adicionar participantes (por matrícula ou familiares) */}
				<Dialog>
					<DialogTrigger asChild>
						<Button className="self-start">
							<IconPlus /> Adicionar
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Adicionar participante</DialogTitle>
							<DialogDescription>
								Adicione um participante para o agendamento
							</DialogDescription>
						</DialogHeader>

						<Tabs defaultValue="familiares">
							<TabsList>
								{atividade?.adicionaClienteDependente && (
									<TabsTrigger value="familiares">
										Familiares
									</TabsTrigger>
								)}
								{atividade?.adicionaClienteConvidado && (
									<TabsTrigger value="matricula">
										Por matrícula
									</TabsTrigger>
								)}
							</TabsList>
							<TabsContent value="familiares">
								<div className="flex flex-col gap-4 pt-2">
									{familiares?.map((familiar) => (
										<ParticipanteCard
											key={familiar.clienteId}
											participante={familiar}
										/>
									))}
								</div>
							</TabsContent>
							<TabsContent value="matricula">
								<BuscarParticipantePorMatricula />
							</TabsContent>
						</Tabs>
					</DialogContent>
				</Dialog>

				{/* Tabela de participantes */}
				<Card className="bg-background">
					{participantes.length === 0 ? (
						<div className="p-2">
							Nenhum participante adicionado
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nome</TableHead>
									<TableHead>Matrícula</TableHead>
									<TableHead>Ações</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{participantes.map((participante) => (
									<TableRow key={participante.clienteId}>
										<TableCell>
											{participante.nome}
										</TableCell>
										<TableCell>
											{participante.matricula}
										</TableCell>
										<TableCell>
											<Button
												title="Remover participante"
												variant="destructive"
												size="icon"
												onClick={() =>
													handleRemoveParticipante(
														participante.clienteId,
													)
												}
											>
												<IconTrash />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</Card>
			</div>
		);
	}

	if (!horarioAtual && !horarioAtualFilaEspera) {
		return (
			<Alert
				title="Escolha um horário ou fila de espera primeiro"
				variant="warning"
				ref={refs.passo4}
			/>
		);
	}

	const handleRemoveParticipante = (clienteId: number) => {
		setParticipantes((prev) =>
			prev.filter((p) => clienteId !== p.clienteId),
		);
	};

	return (
		<div className="flex flex-col gap-4" ref={refs.passo4}>
			{horarioAtual &&
				(participantes.length < horarioAtual.qtdMinimaCliente ||
					participantes.length > horarioAtual.qtdMaximaCliente) && (
					<Alert
						title={`${participantes.length} participante(s) adicionado(s)`}
						variant="info"
					>
						Para esse horário, é necessário adicionar no mínimo{" "}
						{horarioAtual.qtdMinimaCliente} e no máximo{" "}
						{horarioAtual.qtdMaximaCliente} participantes
					</Alert>
				)}

			{horarioAtualFilaEspera &&
				(participantes.length <
					horarioAtualFilaEspera.qtdMinimaCliente ||
					participantes.length >
						horarioAtualFilaEspera.qtdMaximaCliente) && (
					<Alert
						title={`${participantes.length} participante(s) adicionado(s)`}
						variant="info"
					>
						Para esse horário, é necessário adicionar no mínimo{" "}
						{horarioAtualFilaEspera.qtdMinimaCliente} e no máximo{" "}
						{horarioAtualFilaEspera.qtdMaximaCliente} participantes
					</Alert>
				)}
			{/* Adicionar participantes (por matrícula ou familiares) */}
			<Dialog>
				<DialogTrigger asChild>
					<Button className="self-start">
						<IconPlus /> Adicionar
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Adicionar participante</DialogTitle>
						<DialogDescription>
							Adicione um participante para o agendamento
						</DialogDescription>
					</DialogHeader>

					<Tabs defaultValue="familiares">
						<TabsList>
							{atividade?.adicionaClienteDependente && (
								<TabsTrigger value="familiares">
									Familiares
								</TabsTrigger>
							)}
							{atividade?.adicionaClienteConvidado && (
								<TabsTrigger value="matricula">
									Por matrícula
								</TabsTrigger>
							)}
						</TabsList>
						<TabsContent value="familiares">
							<div className="flex flex-col gap-4 pt-2">
								{familiares?.map((familiar) => (
									<ParticipanteCard
										key={familiar.clienteId}
										participante={familiar}
									/>
								))}
							</div>
						</TabsContent>
						<TabsContent value="matricula">
							<BuscarParticipantePorMatricula />
						</TabsContent>
					</Tabs>
				</DialogContent>
			</Dialog>

			{/* Tabela de participantes */}
			<Card className="bg-background">
				{participantes.length === 0 ? (
					<div className="p-2">Nenhum participante adicionado</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nome</TableHead>
								<TableHead>Matrícula</TableHead>
								<TableHead>Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{participantes.map((participante) => (
								<TableRow key={participante.clienteId}>
									<TableCell>{participante.nome}</TableCell>
									<TableCell>
										{participante.matricula}
									</TableCell>
									<TableCell>
										<Button
											title="Remover participante"
											variant="destructive"
											size="icon"
											onClick={() =>
												handleRemoveParticipante(
													participante.clienteId,
												)
											}
										>
											<IconTrash />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Card>
		</div>
	);
}

export function useTarefaParticipantes({
	refs,
}: {
	refs: Record<string, React.RefObject<HTMLDivElement>>;
}): Tarefa {
	const horarioAtual = useAtomValue(horarioAtualAtom);
	const horarioAtualFilaEspera = useAtomValue(horarioAtualAtomFilaEsperaAtom);
	const participantes = useAtomValue(participantesAtom);
	const horario = horarioAtual || horarioAtualFilaEspera;

	return {
		id: "participantes",
		name: "Participantes",
		description: "Escolha os participantes do agendamento",
		icon: <IconUsersGroup />,
		display: () => `${participantes.length} adicionado(s)`,
		isChecked:
			horario !== undefined &&
			participantes.length > 0 &&
			participantes.length >= horario.qtdMinimaCliente &&
			participantes.length <= horario.qtdMaximaCliente,
		content: <Participantes refs={refs} />,
	};
}

export function Observacao() {
	const [observacao, setObservacao] = useAtom(observacaoAtom);

	const maxLength = 500;

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;

		if (value.length > maxLength) {
			return;
		}

		setObservacao(value);
	};

	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm text-muted-foreground">
				{observacao.length}/{maxLength}
			</span>
			<Textarea
				value={observacao}
				onChange={handleTextChange}
				placeholder="Caso queira, adicione uma observação..."
			/>
		</div>
	);
}

export function useTarefaObservacao(): Tarefa {
	const observacao = useAtomValue(observacaoAtom);

	return {
		id: "observacao",
		name: "Observação",
		description: "Adicione uma observação ao agendamento (opcional)",
		icon: <IconUsersGroup />,
		display: () =>
			observacao.length > 0 ? "Adicionada" : "Nenhuma observação",
		isChecked: true,
		content: <Observacao />,
	};
}

export function FilaEspera() {
	const {
		data: horarios,
		isPending,
		isError,
		error,
	} = useAtomValue(horariosFilaEsperaAtom);
	const [, setHorarioAtual] = useAtom(horarioAtualAtom);
	const [horarioAtualFilaEspera, setHorarioAtualFilaEspera] = useAtom(
		horarioAtualAtomFilaEsperaAtom,
	);

	const isSelected = (h: Schema["AgendamentoHorarioDTO"]) => {
		return (
			h.agendamentoHorarioId ===
			horarioAtualFilaEspera?.agendamentoHorarioId
		);
	};

	if (
		import.meta.env.VITE_ID_ATIVIDADE_TENIS?.toString() !==
		useParams().idAtividade
	)
		return;

	if (isPending) {
		return <Alert title="Carregando horários..." variant="load" />;
	}

	if (isError) {
		return (
			<Alert title="Erro ao carregar horários" variant="error">
				{error.message}
			</Alert>
		);
	}

	if (!horarios) {
		return (
			<Alert
				title="Escolha uma data e um local primeiro"
				variant="warning"
			/>
		);
	}

	if (horarios.length === 0) {
		return (
			<AlertNenhumDadoEncontrado description="Desculpe, mas não há horários disponíveis nessa data." />
		);
	}

	return (
		<HorariosListByPeriodo
			horarios={horarios}
			onSelect={(h) => {
				// scrollTo(refs.passo4);
				setHorarioAtualFilaEspera(h);
				setHorarioAtual(undefined);
			}}
			isSelected={isSelected}
			showMinMaxParticipantes={true}
		/>
	);
}

export function useTarefaFilaEspera(): Tarefa {
	const horarioAtual = useAtomValue(horarioAtualAtom);
	const horarioAtualFilaEspera = useAtomValue(horarioAtualAtomFilaEsperaAtom);

	const isChecked =
		horarioAtual !== undefined || horarioAtualFilaEspera !== undefined;

	return {
		id: "filaEspera",
		name: "Fila de espera",
		description: "Entre na fila de espera de algum horário (opcional)",
		icon: <ListOrdered />,
		display: () => {
			if (horarioAtualFilaEspera) {
				const inicio = formatTime(
					horarioAtualFilaEspera!.horarioInicio,
				);
				const fim = formatTime(horarioAtualFilaEspera!.horarioFim);

				return `${inicio} - ${fim}`;
			}

			return "Selecionou um horário do agendamento";
		},
		isChecked,
		content: <FilaEspera />,
	};
}
