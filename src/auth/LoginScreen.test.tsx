import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockPort } from "@/telegram/mockPort";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("shows app is not configured when getApiConfig errors", () => {
    render(
      <LoginScreen port={createMockPort()} configured={false} onDone={() => {}} />,
    );
    expect(screen.getByText(/app is not configured/i)).toBeTruthy();
  });

  it("phone then code reaches logged-in callback", async () => {
    const user = userEvent.setup();
    const port = createMockPort({
      startLogin: async () => ({ next: "code" as const }),
      submitCode: async () => ({ next: "done" as const }),
    });
    const onDone = vi.fn();
    render(<LoginScreen port={port} configured onDone={onDone} />);
    await user.type(screen.getByLabelText("Phone number"), "+15555550100");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(screen.getByLabelText("Login code"), "12345");
    await user.click(screen.getByTestId("sign-in"));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("shows password field when submitCode asks for password", async () => {
    const user = userEvent.setup();
    const port = createMockPort({
      startLogin: async () => ({ next: "code" as const }),
      submitCode: async () => ({ next: "password" as const }),
    });
    render(<LoginScreen port={port} configured onDone={() => {}} />);
    await user.type(screen.getByLabelText("Phone number"), "+15555550100");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(screen.getByLabelText("Login code"), "12345");
    await user.click(screen.getByTestId("sign-in"));
    expect(await screen.findByLabelText("Two-step password")).toBeTruthy();
  });

  it("saves telegram api credentials from the first screen", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(
      <LoginScreen configured={false} onDone={() => {}} onSaveCredentials={onSave} />,
    );
    await user.type(screen.getByLabelText("API ID"), "12345");
    await user.type(screen.getByLabelText("API hash"), "abcdef0123456789");
    await user.click(screen.getByRole("button", { name: "Save credentials" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(12345, "abcdef0123456789"),
    );
  });
});
