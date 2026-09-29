'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getClientSideAuthToken } from '@/firebase';
import { Loader2, PlusCircle, CheckCircle2, BriefcaseBusiness, Landmark, Banknote, ArrowRight } from 'lucide-react';
import type { LendingApplicationStatus } from '@/lib/lending/operating-layer';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchFromAdminAPI, formatCurrency } from '@/lib/utils';
import { getAgreementPolicyRules } from '@/lib/lending/policy-engine';

export function LendingOperatingLayer() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [policyConfig, setPolicyConfig] = useState<any>({});
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');

  const [decisionApplication, setDecisionApplication] = useState<any | null>(null);
  const [discoveryApplication, setDiscoveryApplication] = useState<any | null>(null);
  const [discoveryGaps, setDiscoveryGaps] = useState<any[]>([]);
  const [discoverySource, setDiscoverySource] = useState('Questionnaire / ecosystem data');
  const [discoveryWebsite, setDiscoveryWebsite] = useState('');
  const [spiderSources, setSpiderSources] = useState<any[]>([]);
  const [isSpiderRunning, setIsSpiderRunning] = useState(false);
  const [committeeApplication, setCommitteeApplication] = useState<any | null>(null);
  const [committeeOutcome, setCommitteeOutcome] = useState('approved_subject_to_conditions');
  const [clientFacilityLimit, setClientFacilityLimit] = useState('');
  const [agreementFacilityLimit, setAgreementFacilityLimit] = useState('');
  const [committeeRationale, setCommitteeRationale] = useState('');
  const [collateralRequirements, setCollateralRequirements] = useState('');
  const [securityRequirements, setSecurityRequirements] = useState('');
  const [suretyRequirements, setSuretyRequirements] = useState('');
  const [creditPack, setCreditPack] = useState<any | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [riskBand, setRiskBand] = useState('');
  const [approvalLimit, setApprovalLimit] = useState('');
  const [offerTerms, setOfferTerms] = useState('');
  const [conditions, setConditions] = useState('');
  const [bureauConsent, setBureauConsent] = useState('not_obtained');
  const [bureauOutcome, setBureauOutcome] = useState('deferred');
  const [bureauReference, setBureauReference] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    entityType: 'Pty Ltd',
    primaryContact: '',
    email: '',
    phone: '',
    amountRequested: '250000',
    termMonths: '60',
    facilityType: 'Asset Finance',
    fundingNeed: 'fleet-expansion',
    status: 'draft',
    notes: '',
    purposeNarrative: '',
    fundingCause: '',
    proposedAssetOrReceivable: '',
    disclosedPaidUpAssets: '',
    disclosedExistingSecurity: '',
    disclosedLiabilities: '',
    disclosedAdverseEvents: '',
    proposedSureties: '',
    clientId: '',
    facilityId: '',
    masterFacilityId: '',
    caseType: 'global_facility_indication',
    originationType: 'admin',
    originationSourceId: '',
    engagementEvents: [] as Array<Record<string, unknown>>,
    masterFacilityLimit: '0',
    availableFacilityLimit: '0',
    facilityAgreementType: '',
    province: '',
    city: '',
  });

  const loadApplications = useCallback(async () => {
    try {
      const token = await getClientSideAuthToken();
      if (!token) return;
      const [response, clientsResult, facilitiesResult, policiesResult] = await Promise.all([
        fetch('/api/lending/application', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'lendingClients', limit: 250 }),
        fetchFromAdminAPI(token, 'getLendingData', { collectionName: 'facilities', limit: 250 }),
        fetchFromAdminAPI(token, 'getLendingPolicies'),
      ]);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load applications.');
      setApplications(result.data || []);
      setClients(clientsResult.data || []);
      setFacilities(facilitiesResult.data || []);
      setPolicyConfig(policiesResult.data || {});
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: error.message });
    }
  }, [toast]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const submitApplication = async () => {
    try {
      setIsLoading(true);
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');

      const requestedAmount = Number(form.amountRequested || 0);
      const masterLimit = Number(form.masterFacilityLimit || 0);
      const availableLimit = Number(form.availableFacilityLimit || 0);
      if (masterLimit > 0 && requestedAmount > masterLimit) {
        throw new Error('Requested amount may not exceed the client master facility limit.');
      }
      if (!form.facilityId && availableLimit > 0 && requestedAmount > availableLimit) {
        throw new Error('Requested amount may not exceed the available unallocated master facility limit.');
      }

      const response = await fetch('/api/lending/application', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          amountRequested: requestedAmount,
          termMonths: Number(form.termMonths || 0),
          masterFacilityLimit: masterLimit,
          availableFacilityLimit: availableLimit,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          disclosureAttestedAt: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Submission failed.');

      toast({ title: 'Application submitted', description: 'Borrower record created in the lending operating layer.' });
      setForm({
        companyName: '',
        entityType: 'Pty Ltd',
        primaryContact: '',
        email: '',
        phone: '',
        amountRequested: '250000',
        termMonths: '60',
        facilityType: 'Asset Finance',
        fundingNeed: 'fleet-expansion',
        status: 'draft',
        notes: '',
        purposeNarrative: '',
        fundingCause: '',
        proposedAssetOrReceivable: '',
        disclosedPaidUpAssets: '',
        disclosedExistingSecurity: '',
        disclosedLiabilities: '',
        disclosedAdverseEvents: '',
        proposedSureties: '',
        clientId: '',
        facilityId: '',
        masterFacilityId: '',
        caseType: 'global_facility_indication',
        originationType: 'admin',
        originationSourceId: '',
        engagementEvents: [] as Array<Record<string, unknown>>,
        masterFacilityLimit: '0',
        availableFacilityLimit: '0',
        facilityAgreementType: '',
        province: '',
        city: '',
      });
      await loadApplications();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const transitionApplication = async (applicationId: string, status: LendingApplicationStatus) => {
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/lending/application', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId, status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Status update failed.');
      toast({ title: 'Application updated', description: `Case moved to ${status.replace('_', ' ')}.` });
      await loadApplications();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const openDiscovery = async (application: any) => {
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/lending/discovery', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: application.id }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to start discovery.');
      setDiscoveryApplication(application);
      setDiscoveryGaps(result.data?.gaps || []);
      toast({ title: 'Discovery opened', description: 'Confirm disclosures and record forensic variances by source.' });
      await loadApplications();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Discovery unavailable', description: error.message }); }
  };

  const updateDiscoveryGap = async (gapId: string, status: string, findings: string) => {
    if (!discoveryApplication) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/lending/discovery', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: discoveryApplication.id, gapId, status, findings, source: discoverySource }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to update discovery item.');
      setDiscoveryGaps(result.data || []);
    } catch (error: any) { toast({ variant: 'destructive', title: 'Discovery update failed', description: error.message }); }
  };

  const runDiscoverySpider = async () => {
    if (!discoveryApplication) return;
    try {
      setIsSpiderRunning(true);
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/lending/discovery/spider', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: discoveryApplication.id, website: discoveryWebsite }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Public discovery search failed.');
      setSpiderSources([...(result.data?.sources || []), ...(result.data?.websitePages || []).map((page: any) => ({ ...page, sourceType: 'official_website' }))]);
      setDiscoverySource('Public discovery spider');
      toast({ title: 'Public discovery completed', description: `${result.data?.sources?.length || 0} search sources and ${result.data?.websitePages?.length || 0} official-site pages were recorded.` });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Spider failed', description: error.message }); } finally { setIsSpiderRunning(false); }
  };

  const prepareCreditPack = async (applicationId: string) => {
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/lending/credit-committee', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to prepare credit evaluation pack.');
      toast({ title: 'Credit evaluation pack prepared', description: `${result.data?.unresolvedGaps?.length || 0} discovery gaps remain open.` });
      await loadApplications();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Pack preparation failed', description: error.message }); }
  };

  const viewCreditPack = async (applicationId: string) => {
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch(`/api/admin/lending/credit-committee?applicationId=${encodeURIComponent(applicationId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load credit evaluation pack.');
      setCreditPack(result.data);
    } catch (error: any) { toast({ variant: 'destructive', title: 'Credit pack unavailable', description: error.message }); }
  };

  const openCommittee = (application: any) => {
    setCommitteeApplication(application);
    setCommitteeOutcome(application.creditCommitteeStatus || 'approved_subject_to_conditions');
    setClientFacilityLimit(String(application.creditCommitteeDecision?.clientFacilityLimit || application.approvalLimit || application.amountRequested || ''));
    setAgreementFacilityLimit(String(application.creditCommitteeDecision?.agreementFacilityLimit || application.approvalLimit || application.amountRequested || ''));
    setCommitteeRationale(application.creditCommitteeDecision?.rationale || '');
    setConditions(Array.isArray(application.creditCommitteeDecision?.conditions) ? application.creditCommitteeDecision.conditions.join('\n') : '');
    setCollateralRequirements(Array.isArray(application.creditCommitteeDecision?.collateralRequirements) ? application.creditCommitteeDecision.collateralRequirements.join('\n') : '');
    setSecurityRequirements(Array.isArray(application.creditCommitteeDecision?.securityRequirements) ? application.creditCommitteeDecision.securityRequirements.join('\n') : '');
    setSuretyRequirements(Array.isArray(application.creditCommitteeDecision?.suretyRequirements) ? application.creditCommitteeDecision.suretyRequirements.join('\n') : '');
  };

  const saveCommitteeDecision = async () => {
    if (!committeeApplication) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/lending/credit-committee', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: committeeApplication.id, outcome: committeeOutcome, clientFacilityLimit: Number(clientFacilityLimit), agreementFacilityLimit: Number(agreementFacilityLimit), rationale: committeeRationale, conditions, collateralRequirements, securityRequirements, suretyRequirements }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to record committee decision.');
      toast({ title: 'Credit committee decision recorded' });
      setCommitteeApplication(null);
      await loadApplications();
    } catch (error: any) { toast({ variant: 'destructive', title: 'Committee decision failed', description: error.message }); }
  };

  const openDecisionEditor = (application: any) => {
    setDecisionApplication(application);
    setDecisionNotes(application.decisionNotes || '');
    setRiskBand(application.riskBand || '');
    setApprovalLimit(application.approvalLimit === undefined ? '' : String(application.approvalLimit));
    setOfferTerms(application.offerTerms || '');
    setConditions(Array.isArray(application.conditions) ? application.conditions.join('\n') : '');
  };

  const saveDecisionDetails = async () => {
    if (!decisionApplication) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/lending/application', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: decisionApplication.id,
          status: decisionApplication.status,
          decisionNotes,
          riskBand,
          approvalLimit: approvalLimit === '' ? undefined : Number(approvalLimit),
          offerTerms,
          conditions: conditions.split('\n').map((condition) => condition.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Decision details could not be saved.');
      toast({ title: 'Decision details saved' });
      setDecisionApplication(null);
      await loadApplications();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const recordCreditBureauStep = async () => {
    if (!decisionApplication) return;
    try {
      const token = await getClientSideAuthToken();
      if (!token) throw new Error('Authentication required.');
      const response = await fetch('/api/admin/integrations/credit-bureau', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: decisionApplication.id, consentStatus: bureauConsent, outcome: bureauOutcome, bureauReference, notes: decisionNotes }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Credit-bureau step failed.');
      toast({ title: 'Credit-bureau step recorded', description: 'The workflow has ended in the audit record.' });
      setBureauReference('');
      await loadApplications();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Credit-bureau step failed', description: error.message });
    }
  };

  const summary = useMemo(() => {
    const submitted = applications.filter((app: any) => app.status === 'submitted' || app.status === 'under_review' || app.status === 'approved' || app.status === 'disbursed').length;
    const pending = applications.filter((app: any) => app.status === 'draft').length;
    const totalValue = applications.reduce((sum, app) => sum + (Number(app.amountRequested) || 0), 0);
    return { submitted, pending, totalValue };
  }, [applications]);

  const clientMap = useMemo(() => new Map(clients.map((client: any) => [client.id, client])), [clients]);

  const linkedCase = useMemo(() => {
    if (!form.clientId || (!form.facilityId && !form.masterFacilityId)) return null;
    return applications.find((application: any) => application.clientId === form.clientId && (
      form.facilityId ? application.facilityId === form.facilityId : application.masterFacilityId === form.masterFacilityId && !application.facilityId
    )) || null;
  }, [applications, form.clientId, form.facilityId, form.masterFacilityId]);

  const facilityRows = useMemo(() => {
    const facilityMap = new Map(facilities.map((facility: any) => [facility.id, facility]));
    const subTotalsByMaster = facilities.reduce((totals: Map<string, number>, facility: any) => {
      if (facility.facilityClass === 'sub' && facility.parentId) {
        totals.set(facility.parentId, (totals.get(facility.parentId) || 0) + Number(facility.limit || 0));
      }
      return totals;
    }, new Map<string, number>());

    return facilities
      .filter((facility: any) => facility.ownerType === 'client')
      .map((facility: any) => {
        const master = facility.facilityClass === 'sub' ? facilityMap.get(facility.parentId) : facility;
        const client = clientMap.get(facility.clientId || master?.clientId) || {};
        const masterLimit = Number(master?.limit || 0);
        const allocatedLimit = Number(subTotalsByMaster.get(master?.id) || 0);
        return {
          ...facility,
          client,
          masterFacility: master,
          masterFacilityId: master?.id || facility.id,
          masterFacilityLimit: masterLimit,
          allocatedLimit,
          availableFacilityLimit: Math.max(masterLimit - allocatedLimit, 0),
        };
      })
      .sort((first: any, second: any) => {
        if (first.facilityClass !== second.facilityClass) return first.facilityClass === 'global' ? -1 : 1;
        return Number(second.limit || 0) - Number(first.limit || 0);
      });
  }, [facilities, clientMap]);

  const mapFacilityType = (type?: string) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized.includes('installment') || normalized.includes('asset') || normalized.includes('rental')) return 'Asset Finance';
    if (normalized.includes('discount') || normalized.includes('factor')) return 'Invoice Finance';
    if (normalized.includes('working') || normalized.includes('loan')) return 'Working Capital';
    if (normalized.includes('fleet')) return 'Fleet Expansion';
    return 'Asset Finance';
  };

  const mapFundingNeed = (type?: string) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized.includes('installment') || normalized.includes('asset') || normalized.includes('rental')) return 'asset-acquisition';
    if (normalized.includes('discount') || normalized.includes('working') || normalized.includes('loan')) return 'working-capital';
    return 'fleet-expansion';
  };

  const activePolicyRule = useMemo(() => {
    const rules = getAgreementPolicyRules(policyConfig);
    const normalizedType = String(form.facilityAgreementType || '').trim().toLowerCase();
    if (!normalizedType) return null;
    const matchingRules = rules.filter((rule) => String(rule.agreementType || '').trim().toLowerCase() === normalizedType);
    if (matchingRules.length === 0) return null;
    const province = String(form.province || '').trim().toLowerCase();
    const city = String(form.city || '').trim().toLowerCase();
    return matchingRules.find((rule) => {
      const provinceMatches = !rule.allowedProvinces?.length || rule.allowedProvinces.some((item) => item.trim().toLowerCase() === province);
      const cityMatches = !rule.allowedCities?.length || rule.allowedCities.some((item) => item.trim().toLowerCase() === city);
      return provinceMatches && cityMatches;
    }) || matchingRules[0];
  }, [form.facilityAgreementType, form.province, form.city, policyConfig]);

  const policyMaxAmount = useMemo(() => {
    const caps = [
      Number(activePolicyRule?.maxAmount || 0),
      Number(form.masterFacilityLimit || 0),
      Number(form.availableFacilityLimit || 0),
    ].filter((value) => Number.isFinite(value) && value > 0);
    return caps.length ? Math.min(...caps) : 0;
  }, [activePolicyRule, form.masterFacilityLimit, form.availableFacilityLimit]);

  const policyMaxTerm = Number(activePolicyRule?.maxTermMonths || 0);

  const clampToPolicy = () => {
    setForm((current) => ({
      ...current,
      amountRequested: policyMaxAmount > 0 && Number(current.amountRequested || 0) > policyMaxAmount ? String(policyMaxAmount) : current.amountRequested,
      termMonths: policyMaxTerm > 0 && Number(current.termMonths || 0) > policyMaxTerm ? String(policyMaxTerm) : current.termMonths,
    }));
  };

  const firstNamedPerson = (...groups: any[][]) => {
    for (const group of groups) {
      const person = group?.find((item: any) => String(item?.name || '').trim());
      if (person) return String(person.name).trim();
    }
    return '';
  };

  const formatAddress = (address: any) => [address?.street, address?.suburb, address?.city, address?.province, address?.postalCode].filter(Boolean).join(', ');

  const buildClientContext = (client: any) => {
    const tradingHistory = client.tradingHistory || {};
    const bondDetails = client.bondDetails || {};
    const borrowerEmail = client.email || client.contactEmail || client.primaryEmail || client.representativeEmail || '';
    const borrowerPhone = client.phone || client.contactPhone || client.primaryPhone || client.representativePhone || client.mobile || '';
    const contextLines = [
      client.registrationId ? `Registration number: ${client.registrationId}` : '',
      client.workAddress ? `Work address: ${formatAddress(client.workAddress)}` : '',
      client.propertyStanding ? `Premises standing: ${client.propertyStanding}` : '',
      tradingHistory.tradingSince ? `Trading since: ${tradingHistory.tradingSince}` : '',
      tradingHistory.primaryActivities ? `Primary activities: ${tradingHistory.primaryActivities}` : '',
      tradingHistory.keyCustomers ? `Key customers: ${tradingHistory.keyCustomers}` : '',
      tradingHistory.keySuppliers ? `Key suppliers: ${tradingHistory.keySuppliers}` : '',
      tradingHistory.materialEvents ? `Material events: ${tradingHistory.materialEvents}` : '',
    ].filter(Boolean);

    const liabilityLines = [
      client.hasJudgements ? 'Judgements disclosed in client wizard.' : '',
      client.hasDefaults ? 'Defaults disclosed in client wizard.' : '',
      bondDetails.bank ? `Bond bank: ${bondDetails.bank}` : '',
      bondDetails.outstandingBalance ? `Bond outstanding balance: ${formatCurrency(bondDetails.outstandingBalance)}` : '',
    ].filter(Boolean);

    const suretyNames = [...(client.directors || []), ...(client.shareholders || [])]
      .map((person: any) => String(person?.name || '').trim())
      .filter(Boolean);

    const documentLines = [
      client.userIdUrl ? 'Primary ID attached' : '',
      client.registrationDocUrl ? 'Registration document attached' : '',
      client.ficaDocUrl ? 'FICA document attached' : '',
      client.afsDocUrl ? 'AFS attached' : '',
      client.managementAccountsUrl ? 'Management accounts attached' : '',
      client.bankStatement1Url || client.bankStatement2Url || client.bankStatement3Url ? 'Bank statements attached' : '',
      client.auditors?.firmName ? `Auditors: ${client.auditors.firmName}` : '',
      client.auditors?.contactName ? `Auditor contact: ${client.auditors.contactName}` : '',
      client.auditors?.email ? `Auditor email: ${client.auditors.email}` : '',
      client.landlordDetails?.name ? `Landlord: ${client.landlordDetails.name}` : '',
      client.landlordDetails?.email ? `Landlord email: ${client.landlordDetails.email}` : '',
    ].filter(Boolean);

    return {
      primaryContact: client.primaryContact || client.contactPerson || client.representativeName || firstNamedPerson(client.directors || [], client.shareholders || []),
      email: borrowerEmail,
      phone: borrowerPhone,
      purposeNarrative: contextLines.join('\n'),
      disclosedPaidUpAssets: client.disclosedAssets || '',
      disclosedExistingSecurity: [client.collateralGranted, ...liabilityLines].filter(Boolean).join('\n'),
      disclosedLiabilities: liabilityLines.join('\n'),
      disclosedAdverseEvents: [client.hasJudgements ? 'Judgements disclosed.' : '', client.hasDefaults ? 'Defaults disclosed.' : ''].filter(Boolean).join('\n'),
      proposedSureties: suretyNames.join('\n'),
      notes: documentLines.join('\n'),
    };
  };

  const handleSelectClientOrFacility = (clientIdVal: string, facilityIdVal?: string) => {
    setSelectedClientId(clientIdVal);
    if (facilityIdVal !== undefined) setSelectedFacilityId(facilityIdVal);

    const fac = facilities.find(f => f.id === (facilityIdVal || selectedFacilityId));
    const targetClientId = clientIdVal || fac?.clientId || selectedClientId;
    const client = clients.find(c => c.id === targetClientId);

    if (client || fac) {
      const isSubFacility = fac?.facilityClass === 'sub';
      const clientContext = client ? buildClientContext(client) : { primaryContact: '', email: '', phone: '', purposeNarrative: '', disclosedPaidUpAssets: '', disclosedExistingSecurity: '', disclosedLiabilities: '', disclosedAdverseEvents: '', proposedSureties: '', notes: '' };
      
      setForm({
        companyName: client?.name || '',
        entityType: client?.entityType || 'Pty Ltd',
        primaryContact: client?.primaryContact || client?.contactPerson || clientContext.primaryContact || '',
        email: client?.email || clientContext.email || '',
        phone: client?.phone || clientContext.phone || '',
        amountRequested: isSubFacility ? String(fac.limit || '250000') : '0',
        termMonths: '60',
        facilityType: fac ? mapFacilityType(fac.type) : 'Asset Finance',
        facilityAgreementType: fac ? String(fac.type || '') : '',
        fundingNeed: fac ? mapFundingNeed(fac.type) : 'fleet-expansion',
        status: 'submitted',
        caseType: isSubFacility ? 'agreement_facility_case' : 'global_facility_indication',
        originationType: client?.originationType || client?.sourceType || 'admin',
        originationSourceId: client?.originationSourceId || client?.sourceId || '',
        engagementEvents: Array.isArray(client?.engagementEvents) ? client.engagementEvents : [],
        notes: [`Auto-fetched from client profile & facility ${fac?.id || ''}.`, clientContext.notes].filter(Boolean).join('\n'),
        purposeNarrative: clientContext.purposeNarrative || '',
        fundingCause: 'growth',
        proposedAssetOrReceivable: isSubFacility && String(fac?.type || '').toLowerCase().includes('installment') ? 'Installment sale asset to be captured in Agreement Terminal' : '',
        disclosedPaidUpAssets: clientContext.disclosedPaidUpAssets || '',
        disclosedExistingSecurity: clientContext.disclosedExistingSecurity || '',
        disclosedLiabilities: clientContext.disclosedLiabilities || '',
        disclosedAdverseEvents: clientContext.disclosedAdverseEvents || '',
        proposedSureties: clientContext.proposedSureties || '',
        clientId: targetClientId || '',
        facilityId: isSubFacility ? fac.id : '',
        masterFacilityId: fac?.masterFacilityId || fac?.id || '',
        masterFacilityLimit: String(fac?.masterFacilityLimit || fac?.limit || 0),
        availableFacilityLimit: String(fac?.availableFacilityLimit || 0),
        province: client?.workAddress?.province || '',
        city: client?.workAddress?.city || '',
      });

      toast({
        title: 'Client & Facility Data Loaded',
        description: `Auto-fetched pre-collected data for ${client?.name || 'Borrower'}. Ready for policy & credit evaluation.`,
      });
    }
  };

  return (
    <div className="space-y-8 text-left text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="h-5 w-5 text-primary" />
              <span className="text-2xl font-black">{applications.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">In Motion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <ArrowRight className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-black">{summary.submitted}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-black">R {summary.totalValue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <Card className="border-none shadow-xl bg-white">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-lg font-black"><Landmark className="h-5 w-5 text-primary" /> Credit Vetting & Linked Case Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 text-left">
            <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Fetch Pre-Collected Client & Facility Data
                </h4>
                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary">
                  Existing onboarding data
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Select Borrower Client</Label>
                  <Select value={selectedClientId} onValueChange={(val) => handleSelectClientOrFacility(val)}>
                    <SelectTrigger className="bg-white border-2 font-bold"><SelectValue placeholder="Select Borrower Client..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.entityType || 'Entity'})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Select Global Facility or Agreement Sub-Facility</Label>
                  <Select value={selectedFacilityId} onValueChange={(val) => handleSelectClientOrFacility(selectedClientId, val)}>
                    <SelectTrigger className="bg-white border-2 font-bold"><SelectValue placeholder="Select facility to review..." /></SelectTrigger>
                    <SelectContent>
                      {facilities.filter(f => (!selectedClientId || f.clientId === selectedClientId) && (f.facilityClass === 'global' || f.facilityClass === 'sub')).map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.type} — {formatCurrency(f.limit)} ({f.facilityClass === 'sub' ? 'Sub-Facility' : 'Master Ceiling'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {form.companyName ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex justify-between items-start border-b border-white/10 pb-2">
                    <div>
                      <h4 className="text-base font-black text-white uppercase">{form.companyName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {form.primaryContact} • {form.email || 'No email captured'} • {form.phone || 'No phone'}
                      </p>
                    </div>
                    <Badge className={`font-black text-[10px] uppercase ${linkedCase ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                      {linkedCase ? `Credit case: ${String(linkedCase.status || 'draft').replace(/_/g, ' ')}` : 'Data Fetched'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold text-slate-300 pt-1">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">{form.facilityId ? 'Requested Amount' : 'Master Ceiling'}</span>
                      <span className="text-primary font-black text-sm">{form.facilityId ? formatCurrency(form.amountRequested) : 'Determined by Committee'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Facility Type</span>
                      <span className="font-bold text-white">{form.facilityType}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Operating Territory</span>
                      <span className="font-bold text-white">{form.province || 'N/A'}, {form.city || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Master Ceiling</span>
                      <span className="font-bold text-white">{formatCurrency(form.masterFacilityLimit)}</span>
                    </div>
                  </div>
                </div>

                <details className="group border-2 rounded-2xl bg-slate-50 overflow-hidden">
                  <summary className="p-4 font-black text-xs uppercase tracking-widest text-primary cursor-pointer flex justify-between items-center select-none">
                    <span>Inspect / Edit Intaked Application Details</span>
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-6 pt-2 border-t grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                    <div className="space-y-2">
                      <Label>Company name</Label>
                      <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Fleetline Transport" />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity type</Label>
                      <Select value={form.entityType} onValueChange={(value) => setForm({ ...form, entityType: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pty Ltd">Pty Ltd</SelectItem>
                          <SelectItem value="CC">CC</SelectItem>
                          <SelectItem value="Sole Proprietor">Sole Proprietor</SelectItem>
                          <SelectItem value="Trust">Trust</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary contact</Label>
                      <Input value={form.primaryContact} onChange={(e) => setForm({ ...form, primaryContact: e.target.value })} placeholder="John Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.co.za" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="082 555 1234" />
                    </div>
                    <div className="space-y-2">
                      <Label>Funding need</Label>
                      <Select value={form.fundingNeed} onValueChange={(value) => setForm({ ...form, fundingNeed: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fleet-expansion">Fleet Expansion</SelectItem>
                          <SelectItem value="working-capital">Working Capital</SelectItem>
                          <SelectItem value="asset-replacement">Asset Replacement</SelectItem>
                          <SelectItem value="refinance">Refinancing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Policy province</Label>
                      <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Western Cape" />
                    </div>
                    <div className="space-y-2">
                      <Label>Policy city</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Beaufort West" />
                    </div>
                    {form.facilityId ? <div className="space-y-2">
                      <Label>Agreement amount requested</Label>
                      <Input type="number" max={policyMaxAmount || undefined} value={form.amountRequested} onChange={(e) => setForm({ ...form, amountRequested: e.target.value })} onBlur={clampToPolicy} />
                      {policyMaxAmount > 0 && <p className="text-xs text-muted-foreground">Maximum permitted now: {formatCurrency(policyMaxAmount)}.</p>}
                    </div> : <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"><Label>Global facility ceiling</Label><p className="text-xs text-muted-foreground">No amount is requested by the client here. The Credit Committee determines the ceiling from the verified information.</p></div>}
                    <div className="space-y-2">
                      <Label>Term (Months)</Label>
                      <Input type="number" max={policyMaxTerm || undefined} value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} onBlur={clampToPolicy} />
                      {policyMaxTerm > 0 && <p className="text-xs text-muted-foreground">Maximum permitted term: {policyMaxTerm} months.</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Facility type</Label>
                      <Select value={form.facilityType} onValueChange={(value) => setForm({ ...form, facilityType: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asset Finance">Asset Finance</SelectItem>
                          <SelectItem value="Working Capital">Working Capital</SelectItem>
                          <SelectItem value="Invoice Finance">Invoice Finance</SelectItem>
                          <SelectItem value="Fleet Expansion">Fleet Expansion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed rounded-2xl bg-slate-50 text-center space-y-2">
                <Landmark className="h-8 w-8 text-muted-foreground mx-auto opacity-30" />
                <p className="font-bold text-sm text-muted-foreground">Select a Borrower Client or Sub-Facility Above</p>
                <p className="text-xs text-muted-foreground">The credit module will auto-fetch all pre-collected onboarding data automatically.</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={submitApplication} disabled={isLoading || !form.companyName || (!form.facilityId && !form.masterFacilityId)} className="font-bold text-white gap-2 h-11 px-8 shadow-lg">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {linkedCase ? 'Update Credit Case' : 'Submit to Credit Committee Queue'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-lg font-black"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Operating states</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {[
              'draft',
              'submitted',
              'under_review',
              'approved',
              'conditionally_approved',
              'disbursed',
              'declined',
            ].map((state) => (
              <div key={state} className="flex items-center justify-between rounded-xl border bg-slate-50 p-3">
                <span className="font-semibold capitalize">{state.replace('_', ' ')}</span>
                <Badge variant="outline" className="uppercase text-[9px] font-black">Lifecycle</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="flex items-center gap-2 text-lg font-black"><Landmark className="h-5 w-5 text-primary" /> Client facility implementation workbench</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {facilityRows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No client facilities have been created yet.</div>
          ) : (
            <div className="space-y-3">
              {facilityRows.map((facility: any) => (
                <div key={facility.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-black">{facility.client?.name || 'Unknown client'}</div>
                    <div className="text-sm text-muted-foreground">{facility.type || 'Facility'} · {facility.facilityClass === 'sub' ? 'Agreement sub-facility' : 'Client master facility'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Master ceiling {formatCurrency(facility.masterFacilityLimit)} · Allocated {formatCurrency(facility.allocatedLimit)} · Available {formatCurrency(facility.availableFacilityLimit)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-black text-primary">{formatCurrency(facility.limit)}</span>
                    <Badge variant={facility.facilityClass === 'sub' ? 'default' : 'outline'} className="capitalize">{facility.facilityClass || 'global'}</Badge>
                    <Badge variant="secondary" className="capitalize">{facility.status || 'active'}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleSelectClientOrFacility(facility.clientId, facility.id)}>Fetch into Credit Module</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-lg font-black">Applications queue</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {applications.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No lending applications yet.</div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => (
                <div key={app.id} className="flex flex-col md:flex-row md:items-center md:justify-between rounded-xl border p-4">
                  <div>
                    <div className="font-black">{app.companyName}</div>
                    <div className="text-sm text-muted-foreground">{app.primaryContact} • {app.email}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 md:mt-0">
                    <span className="font-black text-primary">R {Number(app.amountRequested || 0).toLocaleString()}</span>
                    <Badge variant="secondary" className="capitalize">{app.status || 'draft'}</Badge>
                    <Button size="sm" variant="outline" onClick={() => openDiscovery(app)}>Discovery</Button>
                    <Button size="sm" variant="outline" onClick={() => prepareCreditPack(app.id)}>Prepare pack</Button>
                    <Button size="sm" variant="ghost" onClick={() => viewCreditPack(app.id)}>View pack</Button>
                    <Button size="sm" variant="ghost" onClick={() => openCommittee(app)}>Committee</Button>
                    {app.status === 'submitted' && <Button size="sm" variant="outline" onClick={() => transitionApplication(app.id, 'under_review')}>Start review</Button>}
                    {app.status === 'under_review' && <>
                      <Button size="sm" onClick={() => transitionApplication(app.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => transitionApplication(app.id, 'conditionally_approved')}>Conditions</Button>
                      <Button size="sm" variant="destructive" onClick={() => transitionApplication(app.id, 'declined')}>Decline</Button>
                    </>}
                    {app.status === 'approved' && <Button size="sm" onClick={() => transitionApplication(app.id, 'offer_issued')}>Issue offer</Button>}
                    {app.status === 'conditionally_approved' && <Button size="sm" onClick={() => transitionApplication(app.id, 'offer_issued')}>Issue conditional offer</Button>}
                    {app.status === 'offer_issued' && <Button size="sm" onClick={() => transitionApplication(app.id, 'offer_accepted')}>Record acceptance</Button>}
                    {app.status === 'offer_accepted' && <Button size="sm" onClick={() => transitionApplication(app.id, 'disbursed')}>Mark disbursed</Button>}
                    {['under_review', 'approved', 'conditionally_approved', 'offer_issued', 'offer_accepted', 'declined', 'disbursed'].includes(app.status) && <Button size="sm" variant="ghost" onClick={() => openDecisionEditor(app)}>Decision details</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(discoveryApplication)} onOpenChange={(open) => !open && setDiscoveryApplication(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Discovery: declared versus discovered</DialogTitle><DialogDescription>{discoveryApplication?.companyName}. Use source evidence from questionnaires, ecosystem activity, gap analysis, Sparkle, commercial deep dives, registry checks, and supplied documents.</DialogDescription></DialogHeader>
          <div className="space-y-3"><div className="rounded-md border bg-muted/20 p-3 space-y-2"><Label>Public discovery spider</Label><div className="flex gap-2"><Input value={discoveryWebsite} onChange={(event) => setDiscoveryWebsite(event.target.value)} placeholder="Optional official company website" /><Button type="button" onClick={runDiscoverySpider} disabled={isSpiderRunning}>{isSpiderRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run public search'}</Button></div><p className="text-xs text-muted-foreground">Searches public company and asset evidence only. Results are source evidence for review, not verified facts.</p>{spiderSources.length > 0 && <div className="max-h-36 overflow-y-auto space-y-2 border-t pt-2">{spiderSources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" className="block text-xs hover:underline"><strong>{source.title || source.url}</strong><span className="block text-muted-foreground">{source.snippet || source.excerpt || source.url}</span></a>)}</div>}</div><div className="space-y-2"><Label>Evidence source</Label><Input value={discoverySource} onChange={(event) => setDiscoverySource(event.target.value)} /></div>{discoveryGaps.map((gap) => <div key={gap.id} className="rounded-md border p-3 space-y-2"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{gap.requirement}</p><p className="text-xs text-muted-foreground">Declared: {gap.disclosedValue || 'Nothing disclosed'}</p></div><Badge variant={gap.status === 'variance_found' ? 'destructive' : gap.status === 'confirmed' ? 'default' : 'outline'}>{String(gap.status || 'pending').replace('_', ' ')}</Badge></div><Textarea defaultValue={gap.findings || ''} placeholder="Record verified finding, omitted asset/liability, security candidate, or why this is not applicable" rows={2} onBlur={(event) => { if (event.target.value !== (gap.findings || '')) updateDiscoveryGap(gap.id, gap.status || 'pending', event.target.value); }} /><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => updateDiscoveryGap(gap.id, 'confirmed', gap.findings || '')}>Confirm</Button><Button type="button" size="sm" variant="destructive" onClick={() => updateDiscoveryGap(gap.id, 'variance_found', gap.findings || '')}>Record variance</Button><Button type="button" size="sm" variant="ghost" onClick={() => updateDiscoveryGap(gap.id, 'not_applicable', gap.findings || '')}>Not applicable</Button></div></div>)}</div>
          <DialogFooter><Button onClick={() => setDiscoveryApplication(null)}>Close discovery</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(creditPack)} onOpenChange={(open) => !open && setCreditPack(null)}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Credit evaluation pack</DialogTitle><DialogDescription>Discovery snapshot and internal agreement conduct at the time the pack was prepared.</DialogDescription></DialogHeader><div className="space-y-4 max-h-[65vh] overflow-y-auto"><Card><CardHeader><CardTitle className="text-base">Internal credit history</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{creditPack?.internalCreditHistory?.clientType === 'new_client' ? <p className="font-semibold">{creditPack.internalCreditHistory.note}</p> : <><p>Existing client: {creditPack?.internalCreditHistory?.agreementCount || 0} agreements, {creditPack?.internalCreditHistory?.liveAgreementCount || 0} live, {creditPack?.internalCreditHistory?.bookingAgreementCount || 0} in booking.</p><p>Internal ledger: {creditPack?.internalCreditHistory?.transactionCount || 0} transactions; outstanding balance R {Number(creditPack?.internalCreditHistory?.outstandingBalance || 0).toLocaleString()}.</p><p>Arrears indicators: {creditPack?.internalCreditHistory?.arrearsIndicators || 0}.</p>{(creditPack?.internalCreditHistory?.agreementConduct || []).map((agreement: any) => <div key={agreement.id} className="rounded border p-2">{agreement.description || agreement.id} · {agreement.type} · {agreement.status} · R {Number(agreement.totalAdvanced || 0).toLocaleString()}</div>)}</>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Discovery position</CardTitle></CardHeader><CardContent><p className="text-sm">Unresolved gaps: {creditPack?.unresolvedGaps?.length || 0}</p>{(creditPack?.unresolvedGaps || []).map((gap: any) => <p key={gap.id} className="mt-2 text-sm">{gap.requirement}</p>)}</CardContent></Card></div><DialogFooter><Button onClick={() => setCreditPack(null)}>Close</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(committeeApplication)} onOpenChange={(open) => !open && setCommitteeApplication(null)}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Credit committee decision</DialogTitle><DialogDescription>{committeeApplication?.companyName}. Committee conditions, collateral, security, and surety requirements will form the Booking requirements.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2"><div className="space-y-2"><Label>Committee outcome</Label><Select value={committeeOutcome} onValueChange={setCommitteeOutcome}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="approved_subject_to_conditions">Approved subject to conditions</SelectItem><SelectItem value="further_discovery_required">Further discovery required</SelectItem><SelectItem value="declined">Declined</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Client facility limit</Label><Input type="number" min="0" value={clientFacilityLimit} onChange={(event) => setClientFacilityLimit(event.target.value)} /></div><div className="space-y-2"><Label>Agreement facility limit</Label><Input type="number" min="0" value={agreementFacilityLimit} onChange={(event) => setAgreementFacilityLimit(event.target.value)} /></div><div className="space-y-2"><Label>Committee rationale</Label><Textarea value={committeeRationale} onChange={(event) => setCommitteeRationale(event.target.value)} rows={3} /></div><div className="space-y-2"><Label>Facility conditions</Label><Textarea value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder="One condition per line" rows={4} /></div><div className="space-y-2"><Label>Collateral requirements</Label><Textarea value={collateralRequirements} onChange={(event) => setCollateralRequirements(event.target.value)} placeholder="One requirement per line" rows={4} /></div><div className="space-y-2"><Label>Security requirements</Label><Textarea value={securityRequirements} onChange={(event) => setSecurityRequirements(event.target.value)} placeholder="One requirement per line" rows={4} /></div><div className="space-y-2"><Label>Surety requirements</Label><Textarea value={suretyRequirements} onChange={(event) => setSuretyRequirements(event.target.value)} placeholder="One requirement per line" rows={4} /></div></div><DialogFooter><Button variant="outline" onClick={() => setCommitteeApplication(null)}>Cancel</Button><Button onClick={saveCommitteeDecision}>Record committee decision</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(decisionApplication)} onOpenChange={(open) => !open && setDecisionApplication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decision details</DialogTitle>
            <DialogDescription>{decisionApplication?.companyName} · {decisionApplication?.status?.replace('_', ' ')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Risk band</Label>
              <Select value={riskBand || 'unrated'} onValueChange={(value) => setRiskBand(value === 'unrated' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Select risk band" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unrated">Unrated</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Approval limit</Label>
              <Input type="number" min="0" value={approvalLimit} onChange={(event) => setApprovalLimit(event.target.value)} placeholder="Approved amount" />
            </div>
            <div className="space-y-2">
              <Label>Decision notes</Label>
              <Textarea value={decisionNotes} onChange={(event) => setDecisionNotes(event.target.value)} placeholder="Conditions, rationale, or follow-up required" rows={5} />
            </div>
            <div className="space-y-2">
              <Label>Offer terms</Label>
              <Textarea value={offerTerms} onChange={(event) => setOfferTerms(event.target.value)} placeholder="Rate, term, fees, repayment frequency, and security terms" rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Conditions</Label>
              <Textarea value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder="One condition per line" rows={4} />
            </div>
            <div className="border-t pt-4 space-y-3">
              <div><Label>Credit-bureau workflow step</Label><p className="text-xs text-muted-foreground">No bureau is selected. Record consent and leave the step pending or deferred until a provider is chosen.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={bureauConsent} onValueChange={setBureauConsent}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="obtained">Consent obtained</SelectItem><SelectItem value="not_obtained">Consent not obtained</SelectItem><SelectItem value="withdrawn">Consent withdrawn</SelectItem></SelectContent></Select>
                <Select value={bureauOutcome} onValueChange={setBureauOutcome}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deferred">Deferred</SelectItem><SelectItem value="pending_provider">Pending provider</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
              </div>
              <Input value={bureauReference} onChange={(event) => setBureauReference(event.target.value)} placeholder="Optional bureau/provider reference" />
              <Button type="button" variant="outline" onClick={recordCreditBureauStep}>Record credit-bureau step and audit</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionApplication(null)}>Cancel</Button>
            <Button onClick={saveDecisionDetails}>Save details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
