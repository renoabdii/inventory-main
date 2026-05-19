import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title = "Konfirmasi",
  description,
  onConfirm,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  variant = "default",
}: ConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;

/**
 * Hook untuk menggunakan confirm dialog secara imperatif
 */
import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  variant: "default" | "destructive";
  onConfirm: () => void;
}

export const useConfirmDialog = () => {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "Konfirmasi",
    description: "",
    confirmText: "Ya, Lanjutkan",
    variant: "default",
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (options: {
      title?: string;
      description: string;
      confirmText?: string;
      variant?: "default" | "destructive";
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title: options.title || "Konfirmasi",
          description: options.description,
          confirmText: options.confirmText || "Ya, Lanjutkan",
          variant: options.variant || "default",
          onConfirm: () => {
            setState((s) => ({ ...s, open: false }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setState((s) => ({ ...s, open: false }));
    }
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.title}
      description={state.description}
      confirmText={state.confirmText}
      variant={state.variant}
      onConfirm={state.onConfirm}
    />
  );

  return { confirm, ConfirmDialogComponent };
};
