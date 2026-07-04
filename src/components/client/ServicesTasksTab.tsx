import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';

const HST_FREQ = [
  { value: 'annual', label: 'Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
];
const BK_FREQ = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];
const QUARTER_OPTS = [
  { value: 'jan_apr_jul_oct', label: 'Jan / Apr / Jul / Oct' },
  { value: 'feb_may_aug_nov', label: 'Feb / May / Aug / Nov' },
  { value: 'mar_jun_sep_dec', label: 'Mar / Jun / Sep / Dec' },
];
const SUBTASK_STATUSES = ['pending', 'active', 'completed'];

interface Props {
  clientId: string;
}

export default function ServicesTasksTab({ clientId }: Props) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cfg, t] = await Promise.all([
        apiService.getServiceConfig(clientId),
        apiService.getClientTasks(clientId),
      ]);
      setConfig(cfg || {});
      setTasks(t || []);
    } catch (e) {
      toast({ title: 'Failed to load services & tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId]);

  const set = (key: string, value: any) => setConfig((c) => ({ ...c, [key]: value }));

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await apiService.updateServiceConfig(clientId, config);
      toast({ title: 'Service config saved', description: `${res?.tasksCreated ?? 0} task(s) generated` });
      await load();
    } catch (e) {
      toast({ title: 'Failed to save config', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changeSubtask = async (taskId: string, subtaskId: string, status: string) => {
    try {
      await apiService.updateSubtask(taskId, subtaskId, status);
      await load();
    } catch (e) {
      toast({ title: 'Failed to update subtask', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* ── Service configuration ── */}
      <Card>
        <CardHeader>
          <CardTitle>Service Configuration</CardTitle>
          <CardDescription>
            Enabling a service and filling its details generates the recurring tasks from the template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* T2 */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox checked={!!config.t2_enabled} onCheckedChange={(v) => set('t2_enabled', !!v)} />
              Corporation Tax (T2)
            </label>
            {config.t2_enabled && (
              <div className="grid gap-3 sm:grid-cols-2 pl-6">
                <Field label="Fiscal year end">
                  <Input type="date" value={config.fiscal_year_end || ''} onChange={(e) => set('fiscal_year_end', e.target.value)} />
                </Field>
                <label className="flex items-center gap-2 self-end">
                  <Checkbox checked={!!config.t2_cra_installment} onCheckedChange={(v) => set('t2_cra_installment', !!v)} />
                  CRA installments (T2)
                </label>
                {config.t2_cra_installment && (
                  <Field label="T2 tax year end">
                    <Input type="date" value={config.t2_tax_year_end || ''} onChange={(e) => set('t2_tax_year_end', e.target.value)} />
                  </Field>
                )}
              </div>
            )}
          </section>

          {/* HST */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox checked={!!config.hst_enabled} onCheckedChange={(v) => set('hst_enabled', !!v)} />
              Sales tax (HST)
            </label>
            {config.hst_enabled && (
              <div className="grid gap-3 sm:grid-cols-2 pl-6">
                <Field label="Frequency">
                  <SelectBox value={config.hst_frequency} onChange={(v) => set('hst_frequency', v)} options={HST_FREQ} />
                </Field>
                {config.hst_frequency === 'annual' && (
                  <Field label="Sales tax year end">
                    <Input type="date" value={config.hst_year_end || ''} onChange={(e) => set('hst_year_end', e.target.value)} />
                  </Field>
                )}
                {config.hst_frequency === 'quarterly' && (
                  <Field label="Quarter option">
                    <SelectBox value={config.hst_quarter_option} onChange={(v) => set('hst_quarter_option', v)} options={QUARTER_OPTS} />
                  </Field>
                )}
                <label className="flex items-center gap-2 self-end">
                  <Checkbox checked={!!config.hst_cra_installment} onCheckedChange={(v) => set('hst_cra_installment', !!v)} />
                  CRA installments (HST)
                </label>
                {config.hst_cra_installment && (
                  <Field label="HST tax year end">
                    <Input type="date" value={config.hst_tax_year_end || ''} onChange={(e) => set('hst_tax_year_end', e.target.value)} />
                  </Field>
                )}
              </div>
            )}
          </section>

          {/* Bookkeeping */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox checked={!!config.bookkeeping_enabled} onCheckedChange={(v) => set('bookkeeping_enabled', !!v)} />
              Bookkeeping
            </label>
            {config.bookkeeping_enabled && (
              <div className="grid gap-3 sm:grid-cols-2 pl-6">
                <Field label="Frequency">
                  <SelectBox value={config.bookkeeping_frequency} onChange={(v) => set('bookkeeping_frequency', v)} options={BK_FREQ} />
                </Field>
                {config.bookkeeping_frequency === 'quarterly' && (
                  <Field label="Quarter option">
                    <SelectBox value={config.bookkeeping_quarter_option} onChange={(v) => set('bookkeeping_quarter_option', v)} options={QUARTER_OPTS} />
                  </Field>
                )}
              </div>
            )}
          </section>

          {/* Payroll (flags — full details generated in payroll phase) */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox checked={!!config.payroll_enabled} onCheckedChange={(v) => set('payroll_enabled', !!v)} />
              Payroll
            </label>
            {config.payroll_enabled && (
              <div className="grid gap-3 sm:grid-cols-2 pl-6">
                <Field label="Next pay date">
                  <Input type="date" value={config.next_pay_date || ''} onChange={(e) => set('next_pay_date', e.target.value)} />
                </Field>
                <Field label="Payroll frequency">
                  <SelectBox value={config.payroll_frequency} onChange={(v) => set('payroll_frequency', v)} options={[
                    { value: 'weekly', label: 'Weekly' }, { value: 'bi_weekly', label: 'Bi-weekly' },
                    { value: 'monthly', label: 'Monthly' }, { value: 'semi_monthly', label: '15th & last day' },
                  ]} />
                </Field>
                <label className="flex items-center gap-2"><Checkbox checked={!!config.t4a_enabled} onCheckedChange={(v) => set('t4a_enabled', !!v)} /> T4A</label>
                <label className="flex items-center gap-2"><Checkbox checked={!!config.t5_enabled} onCheckedChange={(v) => set('t5_enabled', !!v)} /> T5</label>
                <label className="flex items-center gap-2"><Checkbox checked={!!config.t5018_enabled} onCheckedChange={(v) => set('t5018_enabled', !!v)} /> T5018</label>
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>{saving ? 'Saving…' : 'Save & generate tasks'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Generated tasks ── */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.length})</CardTitle>
          <CardDescription>Advancing a subtask updates the client's progress bar.</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks yet. Configure services above and save.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {tasks.map((task) => (
                <AccordionItem key={task.id} value={task.id}>
                  <AccordionTrigger>
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <span className="font-medium">{task.taskName}</span>
                      <div className="flex items-center gap-2">
                        {task.currentClientProgress && <Badge variant="secondary">{task.currentClientProgress}</Badge>}
                        <Badge variant={task.status === 'complete' ? 'default' : 'outline'}>{task.status}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mb-2 text-sm text-muted-foreground">
                      {task.openDate && <>Opens {task.openDate}. </>}
                      {task.dueDate && <>Due {task.dueDate}.</>}
                    </div>
                    <div className="space-y-1">
                      {(task.subtasks || []).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm">{s.order}. {s.subtaskName}</div>
                            <div className="text-xs text-muted-foreground">→ {s.clientProgress}</div>
                          </div>
                          <Select value={s.status} onValueChange={(v) => changeSubtask(task.id, s.id, v)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SUBTASK_STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SelectBox({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
