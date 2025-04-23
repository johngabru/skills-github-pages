import { format } from "date-fns";
import { atom, Getter } from "jotai";
import { atomEffect } from "jotai-effect";
import { atomWithQuery } from "jotai-tanstack-query";
import { tokenAtom, tokenStore } from "~/atoms/token";
import { api } from "~/lib/api";
import { getHorariosFilaEspera } from "~/services/agendamentoHorario";
import { dataAtualAtom } from "./data";
import { localAtualAtom } from "./locais";

export const horarioSelecionadoAtom = atom<
	Schema["AgendamentoHorarioDTO"] | null
>(null);

export const horariosAtom = atomWithQuery((get: Getter) => {
	const token = tokenStore.get(tokenAtom);
	const dataAtual = get(dataAtualAtom);
	const localAtual = get(localAtualAtom);

	return {
		queryKey: ["horarios", localAtual?.atividadeEspacoId, dataAtual],
		queryFn: async () => {
			if (!(localAtual && dataAtual)) {
				return null;
			}

			const { data, error, response } = await api().GET(
				"/api/agendamentoHorario/cliente/data/{data}",
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
					params: {
						path: {
							data: format(dataAtual, "yyyy-MM-dd"),
						},
						query: {
							atividadeId: localAtual.atividadeId,
							atividadeEspacoId: localAtual.atividadeEspacoId,
						},
					},
				},
			);

			if (error || !response.ok) {
				throw new Error("Não foi possível carregar os horários");
			}

			return data;
		},
	};
});

export const horariosFilaEsperaAtom = atomWithQuery((get: Getter) => {
	const token = tokenStore.get(tokenAtom);
	const dataAtual = get(dataAtualAtom);
	const localAtual = get(localAtualAtom);

	return {
		queryKey: [
			"horarios-fila-espera",
			localAtual?.atividadeEspacoId,
			dataAtual,
		],
		queryFn: async () => {
			if (!(localAtual && dataAtual)) {
				return null;
			}

			const { data, error, response } = await getHorariosFilaEspera({
				token,
				localId: localAtual.atividadeEspacoId,
				data: dataAtual,
			});

			if (error || !response.ok) {
				throw new Error("Não foi possível carregar os horários");
			}

			return data;
		},
	};
});

export const horarioAtualAtom = atom<Schema["AgendamentoHorarioDTO"]>();
export const horarioAtualAtomFilaEsperaAtom =
	atom<Schema["AgendamentoHorarioDTO"]>();

export const resetHorarioEffect = atomEffect((get, set) => {
	get(localAtualAtom);
	get(dataAtualAtom);

	set(horarioAtualAtom, undefined);
});
