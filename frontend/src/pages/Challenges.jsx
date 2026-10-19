import { useState } from "react";
import { Flag, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChallengeCard, CreateChallengeDialog, InviteCard, JoinChallengeDialog } from "@/components/challenges/ChallengeParts";
import { EmptyState, PageHeader, SectionTitle } from "@/components/PageHeader";
import { useChallenges, usePeers } from "@/hooks/queries";

export default function Challenges() {
  const { data, isLoading } = useChallenges();
  const { data: peerData } = usePeers();
  const [dialog, setDialog] = useState(null);
  const mine = data?.mine || [];
  const invites = data?.invites || [];

  return (
    <div>
      <PageHeader eyebrow="Challenges" title="Support your group" testid="challenges-title"
        description="Small, cooperative consistency goals for up to 8 people. Progress is shared, and there are no rankings or leaderboards."
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog("join")} data-testid="join-challenge-button"><KeyRound aria-hidden="true" />Join with a code</Button>
            <Button onClick={() => setDialog("create")} data-testid="create-challenge-button"><Plus aria-hidden="true" />Create a challenge</Button>
          </>
        }
      />
      {invites.length > 0 && (
        <section aria-labelledby="invites-title" className="mb-10">
          <SectionTitle id="invites-title">Invitations</SectionTitle>
          <ul className="space-y-3">{invites.map((c) => <InviteCard key={c.id} challenge={c} />)}</ul>
        </section>
      )}
      <section aria-labelledby="mine-title">
        <SectionTitle id="mine-title">Your challenges</SectionTitle>
        {isLoading ? (
          <Skeleton className="h-64 rounded-3xl" />
        ) : mine.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {mine.map((c) => <ChallengeCard key={c.id} challenge={c} peers={peerData?.peers || []} />)}
          </div>
        ) : (
          <EmptyState icon={Flag} title="No challenges yet" testid="challenges-empty"
            action={<Button onClick={() => setDialog("create")}><Plus aria-hidden="true" />Create a challenge</Button>}>
            Start one with your peers, for example "Complete 3 planned sessions this week".
          </EmptyState>
        )}
      </section>
      <CreateChallengeDialog open={dialog === "create"} onOpenChange={(o) => !o && setDialog(null)} />
      <JoinChallengeDialog open={dialog === "join"} onOpenChange={(o) => !o && setDialog(null)} />
    </div>
  );
}
