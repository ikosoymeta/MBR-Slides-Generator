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

interface InactivityWarningDialogProps {
  open: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onExit: () => void;
}

export function InactivityWarningDialog({
  open,
  remainingSeconds,
  onContinue,
  onExit,
}: InactivityWarningDialogProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Inactive</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              You have been inactive for 15 minutes. Your unsaved changes will be
              discarded if you don't respond.
            </span>
            <span className="block text-lg font-semibold text-destructive">
              Auto-exit in {timeDisplay}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onExit}>Exit Edit Mode</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
