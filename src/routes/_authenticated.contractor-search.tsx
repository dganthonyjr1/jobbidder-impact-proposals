/**
 * /contractor-search — NGS Contractor Recruitment Dashboard
 *
 * Lets NGS admins search for contractors by service niche + state,
 * review Google Places results, and send personalized SMS/email invites
 * asking each contractor if they'd like to apply as an NGS subcontractor.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  searchContractors,
  sendRecruitInvite,
  listRecruits,
  updateRecruitStatus,
  getNicheList,
} from "@/lib/contractor-source.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Search,
  Send,
  Phone,
  Globe,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  HardHat,
  UserCheck,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/contractor-search")({
  head: () => ({ meta: [{ title: "Find Contractors — Jobbidder" }] }),
  component: ContractorSearchPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourcedContractor = {
  place_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  niche: { id: string; label: string; parentService: string };
  state: string;
  city: string;
};

type Recruit = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  trade_type: string | null;
  service_niche: string | null;
  service_state: string | null;
  source: string | null;
  invite_method: string | null;
  invite_sent_at: string | null;
  status: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  invited:      "bg-blue-500/20 text-blue-300 border-blue-500/30",
  applied:      "bg-green-500/20 text-green-300 border-green-500/30",
  declined:     "bg-red-500/20 text-red-300 border-red-500/30",
  unresponsive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  invited:      <Clock className="h-3 w-3" />,
  applied:      <CheckCircle className="h-3 w-3" />,
  declined:     <XCircle className="h-3 w-3" />,
  unresponsive: <RefreshCw className="h-3 w-3" />,
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function ContractorSearchPage() {
  const queryClient = useQueryClient();

  const doGetNicheList    = useServerFn(getNicheList);
  const doSearchContractors = useServerFn(searchContractors);
  const doSendInvite      = useServerFn(sendRecruitInvite);
  const doListRecruits    = useServerFn(listRecruits);
  const doUpdateStatus    = useServerFn(updateRecruitStatus);

  // Config
  const { data: config } = useQuery({
    queryKey: ["niche-list"],
    queryFn: () => doGetNicheList(),
  });

  // Recruit history
  const { data: recruits = [], refetch: refetchRecruits } = useQuery({
    queryKey: ["recruits"],
    queryFn: () => doListRecruits(),
  });

  // Search form state
  const [nicheId, setNicheId] = useState("");
  const [state, setState] = useState("");
  const [city, setCity]   = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [searchResults, setSearchResults] = useState<SourcedContractor[] | null>(null);
  const [searchSource, setSearchSource] = useState<"google_places" | "mock" | null>(null);
  const [searching, setSearching] = useState(false);

  // Track which place_ids have been invited this session
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Status update
  const { mutateAsync: patchStatus, isPending: patchingStatus } = useMutation({
    mutationFn: (vars: { id: string; status: string }) =>
      doUpdateStatus({ data: { id: vars.id, status: vars.status as any } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      toast.success("Status updated");
    },
  });

  // Available cities for selected state
  const cities = state && config?.stateCities ? config.stateCities[state] ?? [] : [];

  // ---------------------------------------------------------------------------
  // Search handler
  // ---------------------------------------------------------------------------

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!nicheId || !state) {
      toast.error("Select a service niche and state first.");
      return;
    }
    setSearching(true);
    setSearchResults(null);
    try {
      const result = await doSearchContractors({ data: {
        nicheId,
        state,
        city: city || undefined,
        maxResults,
      } });
      setSearchResults(result.contractors);
      setSearchSource(result.source);
      if (result.error) toast.error(result.error);
      else if (result.contractors.length === 0) toast.info("No contractors found for this search. Try a different city or niche.");
      else toast.success(`Found ${result.contractors.length} contractors${result.source === "mock" ? " (demo mode — add GOOGLE_PLACES_API_KEY for live results)" : ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Invite handler
  // ---------------------------------------------------------------------------

  async function handleInvite(contractor: SourcedContractor) {
    setInvitingId(contractor.place_id);
    try {
      const result = await doSendInvite({ data: {
        name: contractor.name,
        phone: contractor.phone,
        trade_type: contractor.niche.label,
        niche: contractor.niche.id,
        service_state: contractor.state,
        source: "google_places",
        source_ref: contractor.place_id,
      } });

      if ("code" in result && result.code === "DUPLICATE") {
        toast.info(`${contractor.name} was already contacted.`);
      } else if (result.ok) {
        const method = (result as any).invite_method ?? "sent";
        toast.success(`Invite sent to ${contractor.name} via ${method}!`);
        setInvitedIds((prev) => new Set(prev).add(contractor.place_id));
        refetchRecruits();
      } else {
        toast.error((result as any).error ?? "Invite failed");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Invite failed");
    } finally {
      setInvitingId(null);
    }
  }

  async function handleInviteAll() {
    if (!searchResults?.length) return;
    const uninvited = searchResults.filter(
      (c) => !invitedIds.has(c.place_id) && !alreadyRecruited(c.place_id),
    );
    if (uninvited.length === 0) {
      toast.info("All contractors on this page have already been invited.");
      return;
    }
    for (const contractor of uninvited) {
      await handleInvite(contractor);
    }
  }

  function alreadyRecruited(placeId: string): boolean {
    return recruits.some((r: Recruit) => r.source === "google_places" && r.id.includes(placeId));
  }

  // ---------------------------------------------------------------------------
  // Recruit history filters
  // ---------------------------------------------------------------------------

  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [historySearch, setHistorySearch] = useState("");

  const filteredRecruits = (recruits as Recruit[]).filter((r) => {
    if (historyFilter !== "all" && r.status !== historyFilter) return false;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.trade_type ?? "").toLowerCase().includes(q) ||
        (r.service_state ?? "").toLowerCase().includes(q) ||
        (r.service_niche ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total:       (recruits as Recruit[]).length,
    invited:     (recruits as Recruit[]).filter((r) => r.status === "invited").length,
    applied:     (recruits as Recruit[]).filter((r) => r.status === "applied").length,
    declined:    (recruits as Recruit[]).filter((r) => r.status === "declined").length,
    unresponsive:(recruits as Recruit[]).filter((r) => r.status === "unresponsive").length,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-blue-400" />
            Find NGS Contractors
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search for skilled contractors by NGS service niche, then send personalized invites to apply as subcontractors.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.invited}</div>
            <div className="text-muted-foreground text-xs">Invited</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.applied}</div>
            <div className="text-muted-foreground text-xs">Applied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-muted-foreground text-xs">Total</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-1" /> Search Contractors
          </TabsTrigger>
          <TabsTrigger value="history">
            <UserCheck className="h-4 w-4 mr-1" /> Outreach History ({stats.total})
          </TabsTrigger>
        </TabsList>

        {/* ── Search Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="search" className="mt-4 space-y-4">

          {/* Search form */}
          <Card className="p-5">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Niche */}
                <div className="space-y-1">
                  <Label htmlFor="niche">NGS Service Niche</Label>
                  <select
                    id="niche"
                    value={nicheId}
                    onChange={(e) => setNicheId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select niche…</option>
                    {config?.niches.map((n) => (
                      <optgroup key={n.parentService} label={n.parentService}>
                        <option key={n.id} value={n.id}>{n.label}</option>
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div className="space-y-1">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setCity(""); }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select state…</option>
                    {(config?.states ?? []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div className="space-y-1">
                  <Label htmlFor="city">City (optional)</Label>
                  {cities.length > 0 ? (
                    <select
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All major cities</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Phoenix"
                    />
                  )}
                </div>

                {/* Max results */}
                <div className="space-y-1">
                  <Label htmlFor="maxResults">Max results</Label>
                  <select
                    id="maxResults"
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={searching} className="flex items-center gap-2">
                  {searching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {searching ? "Searching…" : "Search for Contractors"}
                </Button>
                {searchResults && searchResults.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleInviteAll}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Invite All ({searchResults.length})
                  </Button>
                )}
                {searchSource === "mock" && (
                  <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded">
                    Demo mode — add GOOGLE_PLACES_API_KEY for live results
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Search results */}
          {searchResults && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} contractors found
                {city ? ` in ${city}, ${state}` : ` in ${state}`}
                {" · "}
                <span className="capitalize">
                  {config?.niches.find((n) => n.id === nicheId)?.label ?? nicheId}
                </span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {searchResults.map((c) => {
                  const isInvited = invitedIds.has(c.place_id);
                  const isInviting = invitingId === c.place_id;

                  return (
                    <Card key={c.place_id} className="p-4 space-y-3 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight truncate">{c.name}</h3>
                          {c.rating && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs text-muted-foreground">
                                {c.rating.toFixed(1)} ({c.review_count} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                        {isInvited && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs shrink-0">
                            <CheckCircle className="h-3 w-3 mr-1" /> Invited
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{c.address}</span>
                          </div>
                        )}
                        {c.website && (
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3 w-3 shrink-0" />
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-foreground truncate"
                            >
                              {c.website.replace(/^https?:\/\//, "").split("/")[0]}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <Button
                          size="sm"
                          className="w-full flex items-center gap-1.5"
                          disabled={isInvited || isInviting}
                          onClick={() => handleInvite(c)}
                          variant={isInvited ? "outline" : "default"}
                        >
                          {isInviting ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : isInvited ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {isInviting
                            ? "Sending invite…"
                            : isInvited
                            ? "Invite sent"
                            : "Send Invite to Apply"}
                        </Button>
                        {!c.phone && !isInvited && (
                          <p className="text-[10px] text-muted-foreground text-center mt-1">
                            No phone found — invite will go via email if available
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Outreach History Tab ──────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4 space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["invited", "applied", "declined", "unresponsive"] as const).map((s) => (
              <Card
                key={s}
                className={`p-3 cursor-pointer border-2 transition ${historyFilter === s ? "border-blue-500" : "border-transparent"}`}
                onClick={() => setHistoryFilter(historyFilter === s ? "all" : s)}
              >
                <div className="flex items-center gap-2">
                  {STATUS_ICONS[s]}
                  <div>
                    <div className="text-xl font-bold">{stats[s]}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, trade, state, niche…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>

          {/* History list */}
          {filteredRecruits.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {stats.total === 0
                  ? "No contractors recruited yet. Use the Search tab to find contractors."
                  : "No results match your filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecruits.map((r: Recruit) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{r.name}</span>
                        <Badge className={`text-[10px] border ${STATUS_COLORS[r.status] ?? ""}`}>
                          {STATUS_ICONS[r.status]}
                          <span className="ml-1 capitalize">{r.status}</span>
                        </Badge>
                        {r.service_state && (
                          <Badge variant="outline" className="text-[10px]">{r.service_state}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        {r.trade_type && <span>{r.trade_type}</span>}
                        {r.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.phone}
                          </span>
                        )}
                        {r.invite_method && r.invite_method !== "none" && (
                          <span>Invited via {r.invite_method}</span>
                        )}
                        <span>Sourced {timeAgo(r.created_at)}</span>
                      </div>
                    </div>

                    {/* Status changer */}
                    <select
                      value={r.status}
                      disabled={patchingStatus}
                      onChange={(e) =>
                        patchStatus({ id: r.id, status: e.target.value })
                      }
                      className="text-xs rounded border border-input bg-background px-2 py-1 shrink-0"
                    >
                      <option value="invited">Invited</option>
                      <option value="applied">Applied</option>
                      <option value="declined">Declined</option>
                      <option value="unresponsive">Unresponsive</option>
                    </select>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
