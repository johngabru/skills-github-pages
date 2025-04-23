import { json } from "@remix-run/node";
import { createRemixStub } from "@remix-run/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockAtividadeDTO } from "~/mocks/dto";
import { getByTarefaId } from "~/utils/tests";
import { getTipoAgendamentoInfo } from "~/utils/tipo-agendamento";
import Page from "../../route";

describe("Tarefa de Termos e Condições", () => {
	const RemixStub = createRemixStub([
		{
			path: "/",
			Component: Page,
			loader: async () =>
				json({
					atividade: mockAtividadeDTO({}),
					tipoAgendamento: getTipoAgendamentoInfo("CHURRASQUEIRA"),
					locais: [],
					procedimentos: [],
					familiares: [],
				}),
		},
	]);

	it("Deve aceitar os termos e condições na lista de tarefas", async () => {
		render(<RemixStub />);

		const tarefa = await getByTarefaId("termos-e-condicoes");

		const modalButton = await screen.findByText(/Ler Termos e Condições/i);

		await userEvent.click(modalButton);

		const checkbox = await screen.findByTestId(
			"termos-e-condicoes-checkbox",
		);

		expect(tarefa.getAttribute("aria-checked")).toBe("false");

		await userEvent.click(checkbox);

		expect(tarefa.getAttribute("aria-checked")).toBe("true");
	});
});
