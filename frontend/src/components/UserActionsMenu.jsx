import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, Flag, MoreHorizontal, UserMinus, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { api, errorMessage } from "@/lib/api";

export function UserActionsMenu({ person, muted = false, linkId, isPeer = false, onChanged }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);

  const refresh = () => {
    ["peers", "feed", "hidden", "challenges"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    onChanged?.();
  };
  const run = async (fn, message) => {
    try {
      await fn();
      toast.success(message);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleMute = () => run(
    () => (muted ? api.delete(`/users/${person.id}/mute`) : api.post(`/users/${person.id}/mute`)),
    muted ? `${person.name} unmuted` : `${person.name} muted. Their activity is hidden from your feed.`
  );

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid={`user-actions-${person.username}`}>
            <MoreHorizontal aria-hidden="true" />Options<span className="sr-only"> for {person.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isPeer && (
            <DropdownMenuItem onSelect={toggleMute} data-testid="user-action-mute">
              {muted ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              {muted ? "Unmute" : "Mute"}
            </DropdownMenuItem>
          )}
          {isPeer && (
            <DropdownMenuItem onSelect={() => setDialog("remove")} data-testid="user-action-remove">
              <UserMinus aria-hidden="true" />Remove peer
            </DropdownMenuItem>
          )}
          {isPeer && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => setDialog("block")} data-testid="user-action-block">
            <Ban aria-hidden="true" />Block
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("report")} data-testid="user-action-report">
            <Flag aria-hidden="true" />Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={dialog === "block"} onOpenChange={(o) => !o && setDialog(null)} testid="block-confirm-dialog"
        title={`Block ${person.name}?`} confirmLabel="Block" destructive
        description="They won't be able to send you peer requests, reactions or challenge invites, and you'll stop being peers. They won't be told. You can unblock them in Settings."
        onConfirm={() => run(() => api.post(`/users/${person.id}/block`), `${person.name} blocked`)}
      />
      <ConfirmDialog
        open={dialog === "remove"} onOpenChange={(o) => !o && setDialog(null)} testid="remove-peer-dialog"
        title={`Remove ${person.name} as a peer?`} confirmLabel="Remove peer"
        description="You'll stop seeing each other's shared workouts. You can send a new request later."
        onConfirm={() => run(() => api.delete(`/peers/links/${linkId}`), `${person.name} removed from your peers`)}
      />
      <ReportDialog person={person} open={dialog === "report"} onOpenChange={(o) => !o && setDialog(null)} />
    </>
  );
}
