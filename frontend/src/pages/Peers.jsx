import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, HandHeart, Inbox, Search, Send, UserPlus, Users, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextField } from "@/components/FormField";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { UserActionsMenu } from "@/components/UserActionsMenu";
import { useFeed, usePeers } from "@/hooks/queries";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/dates";
import { initials, plural } from "@/lib/format";

export function Avatar({ name }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 font-mono text-sm font-bold text-emerald-300" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function PersonLine({ person, children }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar name={person.name} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{person.name}</p>
        <p className="font-mono text-sm text-slate-600">@{person.username}</p>
      </div>
      {children}
    </div>
  );
}

function Feed() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useFeed();
  const react = async (item) => {
    try {
      const { data: res } = await api.post(`/sessions/${item.id}/react`);
      qc.setQueryData(["feed"], (old) => old.map((f) => (f.id === item.id ? { ...f, reacted_by_me: res.reacted, reactions_count: res.reactions_count } : f)));
      if (res.reacted) toast.success(`You sent ${item.user.name} a Well done`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  if (isLoading) return <p className="py-6 text-slate-600">Loading activity…</p>;
  if (!data.length) {
    return <EmptyState icon={HandHeart} title="Nothing shared yet" testid="feed-empty">When you or your peers share a completed workout, it shows up here.</EmptyState>;
  }
  return (
    <ul className="space-y-3" data-testid="peer-feed">
      {data.map((f) => (
        <li key={f.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center" data-testid={`feed-item-${f.id}`}>
          <div className="flex flex-1 items-start gap-4">
            <Avatar name={f.user.name} />
            <div>
              <p className="text-slate-900">
                <span className="font-semibold">{f.is_mine ? "You" : f.user.name}</span> completed <span className="font-semibold">{f.title}</span>
              </p>
              <p className="mt-0.5 font-mono text-sm text-slate-600">{f.duration_min} min · {plural(f.exercise_count, "exercise")} · {timeAgo(f.completed_at)}</p>
              {f.reactions_count > 0 && (
                <p className="mt-1 text-sm text-slate-700" data-testid={`feed-reactions-${f.id}`}>
                  {plural(f.reactions_count, "Well done", "Well dones")} {f.is_mine ? "received" : ""}
                </p>
              )}
            </div>
          </div>
          {!f.is_mine && (
            <Button variant={f.reacted_by_me ? "default" : "outline"} aria-pressed={f.reacted_by_me} onClick={() => react(f)} data-testid={`feed-well-done-${f.id}`}>
              {f.reacted_by_me ? <Check aria-hidden="true" /> : <HandHeart aria-hidden="true" />}
              {f.reacted_by_me ? "Well done sent" : "Well done"}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function PeerList({ peers }) {
  if (!peers.length) return <EmptyState icon={Users} title="No peers yet" testid="peers-empty">Use Find a peer to add a classmate by their username.</EmptyState>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {peers.map((p) => (
        <li key={p.link_id} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`peer-${p.user.username}`}>
          <PersonLine person={p.user}>
            {p.muted && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><VolumeX className="h-3.5 w-3.5" aria-hidden="true" />Muted</span>}
            <UserActionsMenu person={p.user} isPeer muted={p.muted} linkId={p.link_id} />
          </PersonLine>
        </li>
      ))}
    </ul>
  );
}

function Requests({ incoming, outgoing }) {
  const qc = useQueryClient();
  const act = async (url, method, message) => {
    try {
      await api[method](url);
      qc.invalidateQueries({ queryKey: ["peers"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  if (!incoming.length && !outgoing.length) return <EmptyState icon={Inbox} title="No requests" testid="requests-empty">Peer requests you send or receive appear here.</EmptyState>;
  return (
    <div className="space-y-8">
      {incoming.length > 0 && (
        <section aria-labelledby="incoming-title">
          <h2 id="incoming-title" className="mb-3 font-display text-lg font-semibold">Waiting for you</h2>
          <ul className="space-y-3">
            {incoming.map((r) => (
              <li key={r.link_id} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`incoming-${r.user.username}`}>
                <PersonLine person={r.user}>
                  <Button onClick={() => act(`/peers/requests/${r.link_id}/accept`, "post", `You and ${r.user.name} are now peers`)} data-testid={`accept-request-${r.user.username}`}>Accept</Button>
                  <Button variant="outline" onClick={() => act(`/peers/requests/${r.link_id}/decline`, "post", "Request declined")} data-testid={`decline-request-${r.user.username}`}>Decline</Button>
                </PersonLine>
              </li>
            ))}
          </ul>
        </section>
      )}
      {outgoing.length > 0 && (
        <section aria-labelledby="outgoing-title">
          <h2 id="outgoing-title" className="mb-3 font-display text-lg font-semibold">Sent by you</h2>
          <ul className="space-y-3">
            {outgoing.map((r) => (
              <li key={r.link_id} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`outgoing-${r.user.username}`}>
                <PersonLine person={r.user}>
                  <span className="hidden text-sm text-slate-600 sm:inline">Waiting for a reply</span>
                  <Button variant="outline" onClick={() => act(`/peers/links/${r.link_id}`, "delete", "Request cancelled")} data-testid={`cancel-request-${r.user.username}`}>Cancel request</Button>
                </PersonLine>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FindPeer() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (name = username) => {
    const { data } = await api.get("/users/lookup", { params: { username: name } });
    setResult(data);
  };
  const search = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!username.trim()) { setError("Enter a username to search."); return; }
    setError("");
    setBusy(true);
    try { await lookup(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const send = async () => {
    try {
      await api.post("/peers/requests", { username: result.username });
      toast.success(`Peer request sent to ${result.name}`);
      qc.invalidateQueries({ queryKey: ["peers"] });
      await lookup(result.username);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const accept = async () => {
    await api.post(`/peers/requests/${result.link_id}/accept`);
    toast.success(`You and ${result.name} are now peers`);
    qc.invalidateQueries({ queryKey: ["peers"] });
    await lookup(result.username);
  };

  const action = {
    none: result?.accepts_requests
      ? <Button onClick={send} data-testid="send-peer-request-button"><Send aria-hidden="true" />Send peer request</Button>
      : <span className="text-sm text-slate-600">Not accepting requests right now</span>,
    outgoing: <Button disabled data-testid="request-sent-label"><Check aria-hidden="true" />Request sent</Button>,
    incoming: <Button onClick={accept} data-testid="accept-found-request-button">Accept request</Button>,
    peers: <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" aria-hidden="true" />Already peers</span>,
    blocked: <span className="text-sm text-slate-600">You've blocked this student. Unblock in Settings.</span>,
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={search} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField id="find-username" label="Classmate's username" className="flex-1" value={username}
          onChange={(e) => setUsername(e.target.value)} error={error} testid="find-peer-input" autoComplete="off"
          hint="There's no public list of students. You need their exact username, for example lebo_k." />
        <Button type="submit" size="lg" disabled={busy} className="sm:mb-[2px]" data-testid="find-peer-button"><Search aria-hidden="true" />Find</Button>
      </form>
      {result && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" data-testid="find-peer-result">
          <PersonLine person={result}>
            {action[result.relation]}
            {result.relation !== "peers" && result.relation !== "blocked" && <UserActionsMenu person={result} onChanged={() => setResult(null)} />}
          </PersonLine>
        </div>
      )}
    </div>
  );
}

export default function Peers() {
  const { data } = usePeers();
  const peers = data?.peers || [];
  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];
  return (
    <div>
      <PageHeader eyebrow="Peers" title="Train alongside classmates" testid="peers-title"
        description="Add peers by username. Nothing is shared until both of you accept, and sharing a workout is always your choice." />
      <Tabs defaultValue="activity">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full bg-slate-100 p-1">
          <TabsTrigger value="activity" className="rounded-full px-4 py-2 data-[state=active]:font-bold" data-testid="peers-tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="peers" className="rounded-full px-4 py-2 data-[state=active]:font-bold" data-testid="peers-tab-peers">My peers ({peers.length})</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full px-4 py-2 data-[state=active]:font-bold" data-testid="peers-tab-requests">
            Requests{incoming.length > 0 && ` (${incoming.length} new)`}
          </TabsTrigger>
          <TabsTrigger value="find" className="rounded-full px-4 py-2 data-[state=active]:font-bold" data-testid="peers-tab-find"><UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />Find a peer</TabsTrigger>
        </TabsList>
        <div className="mt-8">
          <TabsContent value="activity"><Feed /></TabsContent>
          <TabsContent value="peers"><PeerList peers={peers} /></TabsContent>
          <TabsContent value="requests"><Requests incoming={incoming} outgoing={outgoing} /></TabsContent>
          <TabsContent value="find"><FindPeer /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
