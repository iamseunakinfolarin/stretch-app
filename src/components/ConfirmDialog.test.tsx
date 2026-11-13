import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <ConfirmDialog
      open
      title="Leave this prayer?"
      description="Your hours stay with the group."
      confirmLabel="Leave"
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel, ...view };
}

describe("ConfirmDialog", () => {
  it("opens as a modal dialog named by its title and described by its text", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Leave this prayer?" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("Your hours stay with the group.");
  });

  it("stays closed when open is false", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm and onCancel from the buttons", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();
    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("treats Escape as cancel", () => {
    const { onCancel } = setup();
    // Browsers fire "cancel" on the dialog when Escape is pressed.
    screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while busy", () => {
    setup({ busy: true });
    expect(screen.getByRole("button", { name: "Leave" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
