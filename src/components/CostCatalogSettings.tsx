import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save, ChevronDown, ChevronRight, Copy } from "lucide-react";

/**
 * Contractor-facing editor for their own cost-catalog rows.
 *
 * Reads the national starter catalog (global rows) for reference and lets the
 * contractor create/edit/delete THEIR OWN unit costs, which the pricing engine
 * prefers over global rows. RLS keeps a contractor scoped to their own rows.
 */

interface CatalogRow {
  id: string;
  contractor_id: string | null;
  trade: string;
  item_key: string;
  name: string;
  unit: string;
  unit_cost: number;
  retail_unit_cost: number | null;
  aliases: string[];
  source: string;
  active: boolean;
}

const TRADES = ["roofing", "general", "hvac", "plumbing", "electrical", "flooring", "painting", "landscaping", "remodeling", "solar", "glazing"];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || `item_${Date.now()}`;
}

// cost_catalog isn't in the generated Supabase types yet, so query it untyped.
// RLS still enforces that a contractor can only touch their own rows.
const catalog = () => (supabase as any).from("cost_catalog");

export function CostCatalogSettings({ contractorId }: { contractorId: string }) {
  const [own, setOwn] = useState<CatalogRow[]>([]);
  const [global, setGlobal] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGlobal, setShowGlobal] = useState(false);
  const [draft, setDraft] = useState({ trade: "roofing", name: "", unit: "sqft", unit_cost: "", aliases: "" });

  async function load() {
    setLoading(true);
    const [{ data: ownRows }, { data: globalRows }] = await Promise.all([
      catalog().select("*").eq("contractor_id", contractorId).order("trade").order("name"),
      catalog().select("*").is("contractor_id", null).order("trade").order("name"),
    ]);
    setOwn((ownRows as CatalogRow[]) || []);
    setGlobal((globalRows as CatalogRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractorId]);

  async function addRow() {
    const cost = parseFloat(draft.unit_cost);
    if (!draft.name.trim() || !(cost >= 0)) {
      toast.error("Enter an item name and a unit cost.");
      return;
    }
    const aliases = draft.aliases.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
    const { error } = await catalog().insert({
      contractor_id: contractorId,
      trade: draft.trade,
      item_key: slugify(draft.name),
      name: draft.name.trim(),
      unit: draft.unit.trim() || "each",
      unit_cost: cost,
      aliases: aliases.length ? aliases : [draft.name.trim().toLowerCase()],
      source: "contractor",
    } as any);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "You already have an item with that name for this trade." : error.message);
      return;
    }
    toast.success("Catalog item added");
    setDraft({ trade: draft.trade, name: "", unit: draft.unit, unit_cost: "", aliases: "" });
    load();
  }

  async function saveRow(row: CatalogRow) {
    const { error } = await catalog()
      .update({ name: row.name, trade: row.trade, unit: row.unit, unit_cost: row.unit_cost, retail_unit_cost: row.retail_unit_cost, aliases: row.aliases } as any)
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  async function deleteRow(id: string) {
    const { error } = await catalog().delete().eq("id", id);
    if (error) return toast.error(error.message);
    setOwn((r) => r.filter((x) => x.id !== id));
  }

  async function copyGlobal(g: CatalogRow) {
    const { error } = await catalog().insert({
      contractor_id: contractorId,
      trade: g.trade,
      item_key: g.item_key,
      name: g.name,
      unit: g.unit,
      unit_cost: g.unit_cost,
      retail_unit_cost: g.retail_unit_cost,
      aliases: g.aliases,
      source: "contractor",
    } as any);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already in your catalog." : error.message);
      return;
    }
    toast.success(`Copied "${g.name}" — edit it to your pricing`);
    load();
  }

  function patch(id: string, field: keyof CatalogRow, value: string) {
    setOwn((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: field === "unit_cost" || field === "retail_unit_cost" ? (parseFloat(value) || 0) : field === "aliases" ? value.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean) : value } : r)));
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="font-display font-semibold text-lg">Your Cost Catalog</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your real unit costs. When Jobbidder AI prices a proposal, any material it recognizes is priced from
            <strong> your</strong> numbers here instead of an AI estimate — deterministic and defensible. Anything not in
            your catalog still gets a smart AI estimate, so you can add items over time.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {own.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No custom items yet. Add one below, or copy a starter item from the national catalog and tune it.
              </p>
            )}

            {own.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left py-2 pr-3 font-medium">Item</th>
                      <th className="text-left py-2 px-2 font-medium w-28">Trade</th>
                      <th className="text-left py-2 px-2 font-medium w-24">Unit</th>
                      <th className="text-right py-2 px-2 font-medium w-28">Unit cost ($)</th>
                      <th className="text-left py-2 px-2 font-medium">Aliases (comma-sep)</th>
                      <th className="py-2 pl-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {own.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1 pr-3"><Input value={r.name} onChange={(e) => patch(r.id, "name", e.target.value)} className="h-8" /></td>
                        <td className="py-1 px-2">
                          <select value={r.trade} onChange={(e) => patch(r.id, "trade", e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                            {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="py-1 px-2"><Input value={r.unit} onChange={(e) => patch(r.id, "unit", e.target.value)} className="h-8 w-20" /></td>
                        <td className="py-1 px-2"><Input type="number" min={0} step="0.01" value={r.unit_cost} onChange={(e) => patch(r.id, "unit_cost", e.target.value)} className="h-8 w-24 text-right ml-auto" /></td>
                        <td className="py-1 px-2"><Input value={(r.aliases || []).join(", ")} onChange={(e) => patch(r.id, "aliases", e.target.value)} className="h-8" /></td>
                        <td className="py-1 pl-2">
                          <div className="flex gap-1 justify-end">
                            <Button type="button" size="sm" variant="ghost" onClick={() => saveRow(r)} aria-label="Save"><Save className="h-4 w-4" /></Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => deleteRow(r.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add new */}
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <p className="text-sm font-medium">Add an item</p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <select value={draft.trade} onChange={(e) => setDraft((d) => ({ ...d, trade: e.target.value }))} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Input placeholder="Item name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="sm:col-span-2" />
                <Input placeholder="Unit (sqft…)" value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} />
                <Input type="number" min={0} step="0.01" placeholder="$ / unit" value={draft.unit_cost} onChange={(e) => setDraft((d) => ({ ...d, unit_cost: e.target.value }))} />
              </div>
              <Input placeholder="Aliases the AI might use, comma-separated (e.g. tpo, membrane, 60 mil)" value={draft.aliases} onChange={(e) => setDraft((d) => ({ ...d, aliases: e.target.value }))} />
              <Button type="button" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add to my catalog</Button>
            </div>
          </>
        )}
      </Card>

      {/* National starter catalog */}
      <Card className="p-6">
        <button type="button" onClick={() => setShowGlobal((s) => !s)} className="flex items-center gap-2 w-full text-left">
          {showGlobal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-display font-semibold">National starter catalog ({global.length})</span>
          <span className="text-xs text-muted-foreground ml-2">reference pricing — copy any item and tune it to your suppliers</span>
        </button>
        {showGlobal && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-3 font-medium">Item</th>
                  <th className="text-left py-2 px-2 font-medium">Trade</th>
                  <th className="text-left py-2 px-2 font-medium">Unit</th>
                  <th className="text-right py-2 px-2 font-medium">Unit cost ($)</th>
                  <th className="py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {global.map((g) => (
                  <tr key={g.id}>
                    <td className="py-2 pr-3 text-foreground">{g.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{g.trade}</td>
                    <td className="py-2 px-2 text-muted-foreground">{g.unit}</td>
                    <td className="py-2 px-2 text-right">${Number(g.unit_cost).toFixed(2)}</td>
                    <td className="py-2 pl-2 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => copyGlobal(g)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
