import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { formatServerDate } from "~/lib/date";
import { atividadeAtom } from "./atividade";
import { dataAtualAtom } from "./data";

export const locaisAtom = atom<Schema["AtividadeEspacoDTO"][]>();

export const localAtualAtom = atom<Schema["AtividadeEspacoDTO"]>();

export const localSelecionadoAtom = atom<Schema["AtividadeEspacoDTO"] | null>(
	null,
);

export const locaisComHorariosAtom = atomWithQuery((get) => {
	const atividade = get(atividadeAtom);
	const data = get(dataAtualAtom);
	return {
		enabled: atividade !== undefined && data !== undefined,
		queryKey: ["locaisComHorarios", atividade?.atividadeId, data],
		queryFn: async () => {
			const res = await fetch(
				`/api/agendamentoHorario/cliente/data?atividadeId=${atividade!.atividadeId}&data=${formatServerDate(data!)}`,
			);

			if (!res.ok) {
				throw new Error("Erro ao buscar locais com horários.");
			}

			return res.json();
		},
	};
});

export const fetchLocaisHorarios = async (dataSelecionada: Date) => {
	try {
		const response = await fetch(
			`/api/agendamentoHorario/cliente/data?data=${formatServerDate(dataSelecionada)}`,
		);
		if (!response.ok) throw new Error("Erro ao carregar os dados.");

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Erro ao buscar locais com horários", error);
		return [];
	}
};
