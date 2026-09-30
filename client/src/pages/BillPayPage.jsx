import { useEffect, useMemo, useState } from 'react';
import { getAccounts } from '../services/accountService';
import { getServiceCatalog, makeServicePayment, getServicePayments, getPayrollGroups, addPayrollGroup, updatePayrollGroup, removePayrollGroup, getEmployees, addEmployee, updateEmployee, removeEmployee, getPayrollRuns, createPayrollRun, authorizePayrollRun, cancelPayrollRun } from '../services/billPayService';
import { getMaturityInfo } from '../utils/savingsLock';

const naira = value => `NGN ${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
const emptyEmployee = { group_id: '', full_name: '', email: '', bank_name: '', account_name: '', account_number: '', department: '', role: '' };
const emptyGroup = { title: '', company_name: '' };

export default function BillPayPage() {
  const [tab, setTab] = useState('utilities');
  const [catalog, setCatalog] = useState({ electricityProviders: [], waterProviders: [], mobileProviders: [], dataBundles: {} });
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [groups, setGroups] = useState([]);
  const [runs, setRuns] = useState([]);
  const [payment, setPayment] = useState({ service_type: 'electricity', provider: '', customer_reference: '', amount: '', package_code: '', from_account_id: '' });
  const [employee, setEmployee] = useState(emptyEmployee);
  const [group, setGroup] = useState(emptyGroup);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [payroll, setPayroll] = useState({ from_account_id: '', scheduled_for: '' });
  const [payrollAmounts, setPayrollAmounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    const [catalogResponse, accountsResponse, paymentsResponse, groupsResponse, employeesResponse, runsResponse] = await Promise.all([getServiceCatalog(), getAccounts(), getServicePayments(), getPayrollGroups(), getEmployees(), getPayrollRuns()]);
    setCatalog(catalogResponse.data);
    setAccounts(accountsResponse.data.accounts);
    setPayments(paymentsResponse.data.payments);
    setGroups(groupsResponse.data.groups);
    setEmployees(employeesResponse.data.employees);
    setRuns(runsResponse.data.runs);
  };

  useEffect(() => { refresh().catch(err => setError(err.response?.data?.error || 'Unable to load payments')).finally(() => setLoading(false)); }, []);

  const availableAccounts = useMemo(() => accounts.filter(account => !getMaturityInfo(account).locked), [accounts]);
  const providers = payment.service_type === 'electricity' ? catalog.electricityProviders : payment.service_type === 'water' ? catalog.waterProviders : catalog.mobileProviders;
  const bundles = catalog.dataBundles[payment.provider] || [];

  const submitPayment = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = await makeServicePayment({ ...payment, from_account_id: Number(payment.from_account_id), amount: Number(payment.amount) });
      setMessage(`${response.data.message}. Reference: ${response.data.referenceId}`);
      setPayment({ ...payment, customer_reference: '', amount: '', package_code: '' });
      await refresh();
    } catch (err) { setError(err.response?.data?.error || 'Payment failed'); } finally { setSaving(false); }
  };

  const submitEmployee = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editingEmployee) await updateEmployee(editingEmployee.id, employee); else await addEmployee(employee);
      setEmployee(emptyEmployee); setEditingEmployee(null); setShowEmployeeModal(false); await refresh(); setMessage('Employee saved');
    } catch (err) { setError(err.response?.data?.error || 'Unable to save employee'); } finally { setSaving(false); }
  };

  const submitGroup = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editingGroup) await updatePayrollGroup(editingGroup.id, group);
      else await addPayrollGroup(group);
      setGroup(emptyGroup); setEditingGroup(null); await refresh(); setMessage(editingGroup ? 'Payroll group updated' : 'Payroll group created');
    }
    catch (err) { setError(err.response?.data?.error || 'Unable to create payroll group'); }
    finally { setSaving(false); }
  };

  const startGroupEdit = item => {
    setEditingGroup(item);
    setGroup({ title: item.title, company_name: item.company_name });
    setSelectedGroupId(item.id);
    setError('');
  };

  const openEmployeeModal = groupId => {
    setSelectedGroupId(groupId);
    setEditingEmployee(null);
    setEmployee({ ...emptyEmployee, group_id: String(groupId) });
    setShowEmployeeModal(true);
    setError('');
  };

  const groupEmployees = selectedGroupId ? employees.filter(item => item.group_id === selectedGroupId) : [];

  const submitPayroll = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    const items = employees.filter(item => Number(payrollAmounts[item.id]) > 0).map(item => ({ employee_id: item.id, amount: Number(payrollAmounts[item.id]) }));
    try {
      const response = await createPayrollRun({ from_account_id: Number(payroll.from_account_id), scheduled_for: new Date(payroll.scheduled_for).toISOString(), items });
      setMessage(response.data.message); setPayrollAmounts({}); await refresh();
    } catch (err) { setError(err.response?.data?.error || 'Unable to create payroll'); } finally { setSaving(false); }
  };

  const runAction = async (action, id, successMessage) => {
    setSaving(true); setError('');
    try { await action(id); await refresh(); setMessage(successMessage); } catch (err) { setError(err.response?.data?.error || 'Action failed'); } finally { setSaving(false); }
  };

  const deleteGroup = async id => {
    await runAction(removePayrollGroup, id, 'Payroll group deleted');
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  const selectTab = nextTab => {
    setTab(nextTab);
    setPayment(current => ({ ...current, service_type: nextTab === 'utilities' ? 'electricity' : 'airtime', provider: '', package_code: '', amount: '', customer_reference: '' }));
  };

  return <div className="bill-pay-page space-y-6">
    <header className="rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 p-6 text-white shadow-lg">
      <p className="text-xs uppercase tracking-[0.2em] text-indigo-100">Kapita payments</p>
      <h1 className="mt-2 text-2xl font-bold">Everyday Nigerian payments</h1>
      <p className="mt-1 max-w-2xl text-sm text-indigo-100">Pay electricity and water bills, top up every major Nigerian network, and prepare payroll with an explicit authorization step.</p>
    </header>
    {message && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="flex gap-2 overflow-x-auto border-b border-b-secondary pb-2">
      {[['utilities', 'Electricity & Water'], ['mobile', 'Airtime & Data'], ['payroll', 'Payroll']].map(([value, label]) => <button key={value} onClick={() => selectTab(value)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-indigo-600 text-white' : 'bg-elevated text-t-secondary hover:bg-hover'}`}>{label}</button>)}
    </div>

    {tab !== 'payroll' && <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <form onSubmit={submitPayment} className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-t-primary">{tab === 'utilities' ? 'Pay a utility bill' : 'Buy airtime or data'}</h2>
        <p className="mt-1 text-sm text-t-tertiary">Payments are charged in Nigerian naira from your selected account.</p>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {tab === 'mobile' && <select value={payment.service_type} onChange={event => setPayment({ ...payment, service_type: event.target.value, provider: '', package_code: '', amount: '' })} className="rounded-lg border border-b-input px-3 py-2 text-sm"><option value="airtime">Airtime</option><option value="data">Internet bundle</option></select>}
            {tab === 'utilities' && <select value={payment.service_type} onChange={event => setPayment({ ...payment, service_type: event.target.value, provider: '' })} className="rounded-lg border border-b-input px-3 py-2 text-sm"><option value="electricity">Electricity</option><option value="water">Water</option></select>}
            <select required value={payment.provider} onChange={event => setPayment({ ...payment, provider: event.target.value, package_code: '', amount: '' })} className="rounded-lg border border-b-input px-3 py-2 text-sm"><option value="">Select provider</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
          </div>
          <input required value={payment.customer_reference} onChange={event => setPayment({ ...payment, customer_reference: event.target.value })} placeholder={tab === 'mobile' ? 'Nigerian phone number e.g. 080...' : 'Meter or customer number'} className="w-full rounded-lg border border-b-input px-3 py-2 text-sm" />
          {payment.service_type === 'data' && <select required value={payment.package_code} onChange={event => { const bundle = bundles.find(item => item.code === event.target.value); setPayment({ ...payment, package_code: event.target.value, amount: bundle?.amount || '' }); }} className="w-full rounded-lg border border-b-input px-3 py-2 text-sm"><option value="">Select data bundle</option>{bundles.map(bundle => <option key={bundle.code} value={bundle.code}>{bundle.name} - {naira(bundle.amount)}</option>)}</select>}
          <div className="grid gap-4 sm:grid-cols-2">
            <input required type="number" min="50" step="50" value={payment.amount} onChange={event => setPayment({ ...payment, amount: event.target.value })} placeholder="Amount" className="rounded-lg border border-b-input px-3 py-2 text-sm" />
            <select required value={payment.from_account_id} onChange={event => setPayment({ ...payment, from_account_id: event.target.value })} className="rounded-lg border border-b-input px-3 py-2 text-sm"><option value="">Pay from account</option>{availableAccounts.map(account => <option key={account.id} value={account.id}>{account.account_type} · {naira(account.balance)}</option>)}</select>
          </div>
          <button disabled={saving} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Processing...' : 'Pay now'}</button>
        </div>
      </form>
      <div className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm"><h2 className="text-lg font-semibold text-t-primary">Recent service payments</h2><div className="mt-4 space-y-3">{payments.filter(item => item.service_type === payment.service_type || tab === 'utilities' && ['electricity', 'water'].includes(item.service_type)).slice(0, 6).map(item => <div key={item.id} className="flex items-center justify-between border-b border-b-secondary pb-3 text-sm"><div><p className="font-medium capitalize text-t-primary">{item.service_type} · {item.provider}</p><p className="text-xs text-t-tertiary">{item.customer_reference}</p></div><span className="font-semibold text-t-secondary">{naira(item.amount)}</span></div>)}{payments.length === 0 && <p className="text-sm text-t-muted">No payments yet.</p>}</div></div>
    </section>}

    {tab === 'payroll' && <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-6">
        <form onSubmit={submitGroup} className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-t-primary">{editingGroup ? 'Edit payroll group' : 'Create payroll group'}</h2><p className="text-sm text-t-tertiary">Organize employees by company, team, or payroll section.</p></div>{editingGroup && <button type="button" onClick={() => { setEditingGroup(null); setGroup(emptyGroup); }} className="text-xs text-indigo-600">Cancel edit</button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={group.title} onChange={event => setGroup({ ...group, title: event.target.value })} placeholder="Payroll group title" className="rounded-lg border border-b-input px-3 py-2 text-sm" /><input required value={group.company_name} onChange={event => setGroup({ ...group, company_name: event.target.value })} placeholder="Company name" className="rounded-lg border border-b-input px-3 py-2 text-sm" /></div><button disabled={saving} className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{editingGroup ? 'Save group changes' : 'Create group'}</button></form>
        <div className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-t-primary">Payroll groups</h2><p className="text-sm text-t-tertiary">Select a group to view its employees and details.</p></div><span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-t-secondary">{groups.length} groups</span></div><div className="mt-4 space-y-2">{groups.map(item => <div key={item.id} className={`rounded-xl border p-4 ${selectedGroupId === item.id ? 'border-indigo-400 bg-indigo-50/60 shadow-sm' : 'border-b-secondary bg-elevated'}`}><button type="button" onClick={() => setSelectedGroupId(item.id)} className="group w-full text-left"><span className="flex items-center justify-between gap-3"><span className="font-semibold text-t-primary group-hover:text-indigo-700">{item.title}</span><span className="text-xs text-t-muted">{item.employee_count} {item.employee_count === 1 ? 'employee' : 'employees'}</span></span><span className="mt-1 block text-xs text-t-tertiary">{item.company_name}</span></button><div className="mt-3 flex flex-wrap gap-3 border-t border-black/5 pt-3"><button type="button" onClick={() => openEmployeeModal(item.id)} className="text-xs font-semibold text-indigo-600">Add to this group</button><button type="button" onClick={() => startGroupEdit(item)} className="text-xs font-semibold text-indigo-600">Edit group</button><button type="button" onClick={() => deleteGroup(item.id)} className="text-xs font-semibold text-red-600">Delete group</button></div></div>)}{groups.length === 0 && <p className="text-sm text-t-muted">Create a group before adding employees.</p>}</div></div>
        {selectedGroupId && (() => { const selectedGroup = groups.find(item => item.id === selectedGroupId); return selectedGroup && <section className="payroll-group-detail overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm"><div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-700 to-cyan-600 p-5 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Selected payroll group</p><h2 className="mt-1 text-xl font-bold">{selectedGroup.title}</h2><p className="mt-1 text-sm text-indigo-100">{selectedGroup.company_name}</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right"><span className="block text-2xl font-bold">{groupEmployees.length}</span><span className="text-xs text-indigo-100">active employees</span></div></div></div><div className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-t-primary">Group contents</h3><p className="text-sm text-t-tertiary">Review roles, departments, and payment details from the Payroll tab.</p></div><button type="button" onClick={() => openEmployeeModal(selectedGroup.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Add employee</button></div>{groupEmployees.length > 0 ? <div className="overflow-x-auto rounded-xl border border-b-secondary"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-elevated text-xs uppercase text-t-tertiary"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Bank details</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-b-secondary">{groupEmployees.map(item => <tr key={item.id} className="hover:bg-hover"><td className="px-4 py-3"><span className="font-semibold text-t-primary">{item.full_name}</span><span className="block text-xs text-t-tertiary">{item.email || 'No email'}</span></td><td className="px-4 py-3 text-t-secondary">{item.department}</td><td className="px-4 py-3 text-t-secondary">{item.role}</td><td className="px-4 py-3 text-t-secondary">{item.bank_name}<span className="block text-xs text-t-tertiary">{item.account_number}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => { setEditingEmployee(item); setEmployee({ ...item, group_id: String(item.group_id || '') }); setShowEmployeeModal(true); }} className="text-xs font-semibold text-indigo-600">Edit</button></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 text-center"><p className="font-semibold text-t-primary">This group is ready for its first employee</p><p className="mt-1 text-sm text-t-tertiary">Use “Add employee” to add the first employee.</p></div>}</div></section>; })()}
        <div className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm"><h2 className="text-lg font-semibold text-t-primary">Employee list</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-b-secondary text-xs uppercase text-t-tertiary"><tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Payroll group</th><th className="px-3 py-2">Department / section</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Bank details</th><th className="px-3 py-2">Actions</th></tr></thead><tbody className="divide-y divide-b-secondary">{employees.map(item => <tr key={item.id}><td className="px-3 py-3 font-medium text-t-primary">{item.full_name}<span className="block text-xs font-normal text-t-tertiary">{item.email || 'No email'}</span></td><td className="px-3 py-3 text-t-secondary">{item.group_title || 'Unassigned'}<span className="block text-xs text-t-tertiary">{item.company_name || ''}</span></td><td className="px-3 py-3 text-t-secondary">{item.department}</td><td className="px-3 py-3 text-t-secondary">{item.role}</td><td className="px-3 py-3 text-t-secondary">{item.bank_name}<span className="block text-xs text-t-tertiary">{item.account_number}</span></td><td className="px-3 py-3"><div className="flex gap-3"><button onClick={() => { setEditingEmployee(item); setEmployee({ ...item, group_id: String(item.group_id || '') }); }} className="text-xs text-indigo-600">Edit</button><button onClick={() => runAction(removeEmployee, item.id, 'Employee removed')} className="text-xs text-red-600">Remove</button></div></td></tr>)}</tbody></table>{employees.length === 0 && <p className="py-4 text-sm text-t-muted">Create a group and add your first employee.</p>}</div></div>
      </div>
      {showEmployeeModal && (() => { const selectedGroup = groups.find(item => item.id === selectedGroupId); return selectedGroup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitEmployee} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-indigo-200 bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">{selectedGroup.title}</p><h2 className="mt-1 text-xl font-bold text-t-primary">{editingEmployee ? 'Edit employee' : 'Add employee'}</h2><p className="mt-1 text-sm text-t-tertiary">Employee details for {selectedGroup.company_name}</p></div><button type="button" onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployee(emptyEmployee); }} className="rounded-lg bg-elevated px-3 py-2 text-xs font-semibold text-t-secondary">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input type="hidden" value={selectedGroup.id} />{[['full_name','Full name'],['email','Email'],['bank_name','Bank name'],['account_name','Account name'],['account_number','10-digit account number'],['department','Work department / section'],['role','Employee role']].map(([field, label]) => <input key={field} required={field !== 'email'} value={employee[field] || ''} onChange={event => setEmployee({ ...employee, [field]: event.target.value })} placeholder={label} className="rounded-lg border border-b-input px-3 py-2 text-sm" />)}</div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowEmployeeModal(false)} className="rounded-lg bg-elevated px-4 py-2 text-sm font-semibold text-t-secondary">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editingEmployee ? 'Save changes' : 'Add employee'}</button></div></form></div>; })()}
      <div className="space-y-6">
        <form onSubmit={submitPayroll} className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm"><h2 className="text-lg font-semibold text-t-primary">Prepare salary payment</h2><p className="mt-1 text-sm text-t-tertiary">A payroll batch will not execute until you authorize it before the due date and time.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><select required value={payroll.from_account_id} onChange={event => setPayroll({ ...payroll, from_account_id: event.target.value })} className="rounded-lg border border-b-input px-3 py-2 text-sm"><option value="">Fund payroll from</option>{availableAccounts.map(account => <option key={account.id} value={account.id}>{account.account_type} · {naira(account.balance)}</option>)}</select><input required type="datetime-local" value={payroll.scheduled_for} onChange={event => setPayroll({ ...payroll, scheduled_for: event.target.value })} className="rounded-lg border border-b-input px-3 py-2 text-sm" /></div><div className="mt-4 space-y-3">{employees.map(item => <label key={item.id} className="flex items-center gap-3 rounded-lg bg-elevated p-3"><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-t-primary">{item.full_name}</span><span className="block text-xs text-t-tertiary">{item.bank_name} · {item.account_number}</span></span><input type="number" min="0" step="0.01" placeholder="Salary" value={payrollAmounts[item.id] || ''} onChange={event => setPayrollAmounts({ ...payrollAmounts, [item.id]: event.target.value })} className="w-32 rounded-lg border border-b-input px-3 py-2 text-sm" /></label>)}</div><button disabled={saving || employees.length === 0} className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create payroll for authorization</button></form>
        <div className="rounded-xl border border-b-secondary bg-surface p-6 shadow-sm"><h2 className="text-lg font-semibold text-t-primary">Payroll activity</h2><div className="mt-4 space-y-3">{runs.map(run => <div key={run.id} className="rounded-lg border border-b-secondary p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-t-primary">{naira(run.total_amount)} · {run.employee_count} employees</p><p className="text-xs text-t-tertiary">Due {new Date(run.scheduled_for).toLocaleString()}</p></div><span className="rounded-full bg-elevated px-2 py-1 text-xs font-semibold capitalize text-t-secondary">{run.status.replace('_', ' ')}</span></div>{run.status === 'pending_authorization' && <div className="mt-3 flex gap-3"><button onClick={() => runAction(authorizePayrollRun, run.id, 'Payroll authorized')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">Authorize</button><button onClick={() => runAction(cancelPayrollRun, run.id, 'Payroll cancelled')} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">Cancel</button></div>}</div>)}{runs.length === 0 && <p className="text-sm text-t-muted">No payroll batches yet.</p>}</div></div>
      </div>
    </div>}
  </div>;
}
