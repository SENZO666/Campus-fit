import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

const FILTERS = [["open", "Open"], ["resolved", "Resolved"], ["all", "All"]];

function ReportStatus({ status }) {
  const open = status === "open";
  const Icon = open ? CircleAlert : CheckCircle2;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${open ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{open ? "Open" : "Resolved"}
    </span>
  );
}

export default function Admin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reports"], queryFn: () => api.get("/admin/reports").then((r) => r.data), staleTime: 0,
  });
  const rows = data.filter((r) => filter === "all" || r.status === filter);
  const counts = { open: data.filter((r) => r.status === "open").length, resolved: data.filter((r) => r.status === "resolved").length, all: data.length };

  const setStatus = async (r, action) => {
    try {
      await api.post(`/admin/reports/${r.id}/${action}`);
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success(action === "resolve" ? "Report marked as resolved" : "Report reopened");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Reports" testid="admin-title"
        description="Reports students have made about other accounts. Review each one, then mark it resolved." />
      <div role="group" aria-label="Filter reports" className="mb-6 inline-flex rounded-full border border-slate-300 bg-white p-1">
        {FILTERS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} data-testid={`admin-filter-${v}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === v ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
            {l} <span className="font-mono text-xs">({counts[v]})</span>
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-slate-600">Loading reports…</p>
      ) : rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <Table data-testid="admin-reports-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Reported by</TableHead><TableHead>About</TableHead>
                <TableHead>Reason</TableHead><TableHead>Details</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Action</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid={`report-row-${r.id}`}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                  <TableCell><span className="font-medium">{r.reporter.name}</span><br /><span className="font-mono text-xs text-slate-600">@{r.reporter.username}</span></TableCell>
                  <TableCell><span className="font-medium">{r.reported.name}</span><br /><span className="font-mono text-xs text-slate-600">@{r.reported.username}</span></TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell className="max-w-xs text-slate-700">{r.details || <span className="text-slate-500">None given</span>}</TableCell>
                  <TableCell><ReportStatus status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    {r.status === "open" ? (
                      <Button size="sm" onClick={() => setStatus(r, "resolve")} data-testid={`resolve-report-${r.id}`}>Mark resolved</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r, "reopen")} data-testid={`reopen-report-${r.id}`}>Reopen</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={ShieldCheck} title={filter === "open" ? "No open reports" : "No reports here"} testid="admin-empty">
          New reports from students will appear here.
        </EmptyState>
      )}
    </div>
  );
}
