import { Pencil, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetLeads,
  useCreateLead,
  useUpdateLead,
  getGetLeadsQueryKey,
  getGetDashboardQueryKey,
  getGetReportsQueryKey,
  type Lead,
  type LeadInput,
} from '@/lib/insforge-crm';
import { Button, Card, EmptyState, ErrorState, money, PageIntro, Skeleton } from '@/components/crm-shell';
import { FormField, FormSection, Modal, fieldClass, selectClass } from '@/components/crm-modal';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';

const stages = ['New', 'Attempted', 'Connected', 'Interested', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
const blankLead: LeadInput = { name: '', company: '', email: '', phone: '', stage: 'New', owner: '', value: 0, source: 'Referral', priority: 'medium', nextAction: '', followUpDate: new Date().toISOString().slice(0, 10) };

function LeadForm({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const { user, role } = useAuth();
  const userContext = useMemo(() => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }), [user, role]);
  const defaultOwner = lead ? lead.owner : (user?.profile?.name || user?.email?.split('@')[0] || '');
  const [form, setForm] = useState<LeadInput>(lead ? { name: lead.name, company: lead.company, email: lead.email, phone: lead.phone ?? '', stage: lead.stage, owner: lead.owner, value: lead.value, source: lead.source, priority: lead.priority, nextAction: lead.nextAction, followUpDate: lead.followUpDate.slice(0, 10) } : { ...blankLead, owner: defaultOwner });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const create = useCreateLead(userContext);
  const update = useUpdateLead();
  const client = useQueryClient();
  const editing = Boolean(lead);
  const set = (key: keyof LeadInput, value: string | number) => {
    setForm((current: LeadInput) => ({ ...current, [key]: value }));
    setErrors((current: Record<string, string>) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Enter a full name.';
    if (!form.company.trim()) next.company = 'Enter a company.';
    if (!form.email.trim()) next.email = 'Enter an email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
    if (!form.owner.trim()) next.owner = 'Assign an owner.';
    if (Number(form.value) < 0) next.value = 'Value cannot be negative.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;
    const payload = { ...form, value: Number(form.value) || 0 };
    const onSuccess = () => {
      client.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
      client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      client.invalidateQueries({ queryKey: getGetReportsQueryKey() });
      toast({
        title: editing ? 'Lead updated' : 'Lead created',
        description: editing ? `${form.name} was saved.` : `${form.name} is now in your book.`,
      });
      onClose();
    };
    const onError = (error: Error) => {
      setFormError(error.message || 'Couldn’t save this lead.');
      toast({ variant: 'destructive', title: 'Couldn’t save lead', description: error.message });
    };
    if (editing && lead) {
      update.mutate({ id: lead.id, data: payload }, { onSuccess, onError });
    } else {
      create.mutate({ data: payload }, { onSuccess, onError });
    }
  };
  const pending = create.isPending || update.isPending;
  return (
    <Modal
      wide
      eyebrow={editing ? 'BASHAAR / RELATIONSHIPS' : 'BASHAAR / NEW RECORD'}
      title={editing ? 'Edit lead' : 'Add a lead'}
      description={editing ? 'Update contact details, pipeline stage, and the next follow-up.' : 'Capture the relationship cleanly so the rest of the CRM stays in sync.'}
      onClose={onClose}
      testId="modal-lead-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} testId="button-cancel-lead">Cancel</Button>
          <Button type="submit" form="lead-form" disabled={pending} testId="button-save-lead">{pending ? 'Saving…' : editing ? 'Save changes' : 'Create lead'}</Button>
        </>
      }
    >
      <form id="lead-form" data-testid="form-lead" onSubmit={submit} className="grid gap-4" noValidate>
        {formError && <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert">{formError}</div>}
        <FormSection title="Contact information" description="Who this person is and how to reach them.">
          <FormField label="Full name" required error={errors.name}>
            <input required value={form.name} onChange={event => set('name', event.target.value)} className={fieldClass} data-testid="input-lead-name" />
          </FormField>
          <FormField label="Company" required error={errors.company}>
            <input required value={form.company} onChange={event => set('company', event.target.value)} className={fieldClass} data-testid="input-lead-company" />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <input required type="email" value={form.email} onChange={event => set('email', event.target.value)} className={fieldClass} data-testid="input-lead-email" />
          </FormField>
          <FormField label="Phone" hint="Optional, but useful for call follow-up.">
            <input value={form.phone ?? ''} onChange={event => set('phone', event.target.value)} className={fieldClass} data-testid="input-lead-phone" />
          </FormField>
        </FormSection>
        <FormSection title="Lead details" description="Pipeline position, ownership, and commercial value.">
          <FormField label="Owner" required error={errors.owner}>
            <input required value={form.owner} onChange={event => set('owner', event.target.value)} className={fieldClass} data-testid="input-lead-owner" />
          </FormField>
          <FormField label="Value" error={errors.value}>
            <input type="number" min="0" value={form.value} onChange={event => set('value', Number(event.target.value))} className={fieldClass} data-testid="input-lead-value" />
          </FormField>
          <FormField label="Stage">
            <select value={form.stage} onChange={event => set('stage', event.target.value)} className={selectClass} data-testid="select-lead-stage">{stages.map(value => <option key={value}>{value}</option>)}</select>
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={event => set('priority', event.target.value)} className={selectClass} data-testid="select-lead-priority">{['low','medium','high'].map(value => <option key={value}>{value}</option>)}</select>
          </FormField>
          <FormField label="Source" className="sm:col-span-2">
            <select value={form.source} onChange={event => set('source', event.target.value)} className={selectClass} data-testid="select-lead-source">{['Referral','LinkedIn','Website','Partner','Outbound','Google Business'].map(value => <option key={value}>{value}</option>)}</select>
          </FormField>
        </FormSection>
        <FormSection title="Follow-up" description="What happens next, and when.">
          <FormField label="Next action" className="sm:col-span-2">
            <input value={form.nextAction} onChange={event => set('nextAction', event.target.value)} placeholder="e.g. Send proposal, book intro call" className={fieldClass} data-testid="input-lead-nextAction" />
          </FormField>
          <FormField label="Follow-up date">
            <input type="date" value={form.followUpDate} onChange={event => set('followUpDate', event.target.value)} className={fieldClass} data-testid="input-lead-followup" />
          </FormField>
        </FormSection>
      </form>
    </Modal>
  );
}

export function LeadsPage() {
  const { user, role, isViewer } = useAuth();
  const userContext = useMemo(() => ({ email: user?.email, role, name: user?.profile?.name, id: user?.id }), [user, role]);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [owner, setOwner] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'stage' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead>();
  const filteredLeads = useGetLeads({ search: search || undefined, stage: stage || undefined, owner: owner || undefined }, userContext);
  const allLeads = useGetLeads({}, userContext);

  const rawItems = useMemo(() => Array.isArray(filteredLeads.data) ? filteredLeads.data : [], [filteredLeads.data]);
  const owners = useMemo(() => Array.from(new Set((Array.isArray(allLeads.data) ? allLeads.data : []).map(lead => lead.owner))).sort(), [allLeads.data]);

  const sortedItems = useMemo(() => {
    const list = [...rawItems];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'value') comparison = (a.value || 0) - (b.value || 0);
      else if (sortBy === 'stage') comparison = a.stage.localeCompare(b.stage);
      else comparison = (a.updatedAt || '').localeCompare(b.updatedAt || '');
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [rawItems, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [page, sortedItems]);

  useEffect(() => {
    setPage(1);
  }, [search, stage, owner, sortBy, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true' && !isViewer) {
      setEditing(undefined);
      setFormOpen(true);
      window.history.replaceState({}, '', '/leads');
    }
  }, [isViewer]);

  const clearFilters = () => {
    setSearch('');
    setStage('');
    setOwner('');
    setSortBy('updated');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="animate-rise">
      <PageIntro
        eyebrow="BASHAAR / RELATIONSHIPS"
        title="Leads"
        description={role === 'Sales User' ? 'Your active relationships, sorted for action.' : 'Your team relationship book, sorted for action.'}
        action={!isViewer ? <Button onClick={() => { setEditing(undefined); setFormOpen(true); }} testId="button-create-lead"><Plus size={15} /> New lead</Button> : undefined}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search names, companies, emails…"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
              data-testid="input-search-leads"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={stage}
              onChange={event => setStage(event.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none"
              data-testid="select-filter-stage"
            >
              <option value="">All stages</option>
              {stages.map(value => <option key={value}>{value}</option>)}
            </select>
            <select
              value={owner}
              onChange={event => setOwner(event.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none"
              data-testid="select-filter-owner"
            >
              <option value="">All owners</option>
              {owners.map(value => <option key={value}>{value}</option>)}
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={event => {
                const [sb, so] = event.target.value.split('-') as ['name' | 'value' | 'stage' | 'updated', 'asc' | 'desc'];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none font-bold"
              data-testid="select-sort-leads"
            >
              <option value="updated-desc">Recently updated</option>
              <option value="value-desc">Highest value</option>
              <option value="value-asc">Lowest value</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="stage-asc">Stage order</option>
            </select>
            <Button variant="outline" onClick={clearFilters} testId="button-clear-lead-filters">
              <SlidersHorizontal size={14} /> Clear
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Showing {sortedItems.length} lead{sortedItems.length === 1 ? '' : 's'}</span>
            {search && <span className="rounded-full bg-muted px-2 py-0.5">Search: {search}</span>}
            {stage && <span className="rounded-full bg-muted px-2 py-0.5">Stage: {stage}</span>}
            {owner && <span className="rounded-full bg-muted px-2 py-0.5">Owner: {owner}</span>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-leads-prev-page"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
                  data-testid="button-leads-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {filteredLeads.isLoading ? (
          <div className="space-y-2 p-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}</div>
        ) : filteredLeads.isError ? (
          <div className="p-5"><ErrorState onRetry={() => filteredLeads.refetch()} /></div>
        ) : sortedItems.length === 0 ? (
          <EmptyState
            title="No leads match this view"
            body={role === 'Sales User' ? 'Add your first relationship to start tracking your pipeline.' : 'Try a broader search or add a new relationship to the book.'}
            action={!isViewer ? <Button onClick={() => setFormOpen(true)} testId="button-empty-create-lead"><Plus size={14} /> Add lead</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/60 font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-3 py-3 font-medium">Stage</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-3 py-3 font-medium">Next action</th>
                  <th className="px-5 py-3 text-right font-medium"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map(lead => (
                  <tr key={lead.id} className="group transition-colors hover:bg-muted/45" data-testid={`row-lead-${lead.id}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-[hsl(var(--accent))]">
                          {lead.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{lead.name} {lead.isStale && <span className="ml-1 rounded bg-[hsl(39_70%_91%)] px-1.5 py-0.5 text-[9px] text-[hsl(32_68%_34%)]">stale</span>}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{lead.company} · {lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{lead.stage}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium">{lead.owner}</td>
                    <td className="px-3 py-3 font-mono-ui text-xs">{money(lead.value)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{lead.nextAction || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {!isViewer && (
                        <button
                          onClick={() => { setEditing(lead); setFormOpen(true); }}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          data-testid={`button-edit-lead-${lead.id}`}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {formOpen && !isViewer && <LeadForm key={editing?.id ?? 'new'} lead={editing} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
