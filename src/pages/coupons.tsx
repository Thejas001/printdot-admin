import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';
import Link from 'next/link';
import { Select, Tag } from 'antd';
import type { CustomTagProps } from 'rc-select/lib/BaseSelect';

type Product = {
  ProductID: number;
  ProductName: string;
  Description: string;
  ProductImage: string | null;
};

type ApiCoupon = {
  Id: number;
  Code: string;
  Description?: string;
  DiscountAmount: number;
  MinimumOrderValue?: number;
  IsPercentage: boolean;
  MaxDiscountAmount?: number;
  MaxUsageCount?: number;
  MaxUsagePerUser?: number;
  IsFirstOrderOnly?: boolean;
  IsNewUserOnly?: boolean;
  StartDate?: string;
  EndDate?: string;
  IsActive: boolean;
  ApplicableProductIds?: number[];
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'scheduled' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'startDate' | 'discountDesc'>('code');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiCoupon | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [form, setForm] = useState({
    Code: '',
    Description: '',
    DiscountAmount: '' as any,
    MinimumOrderValue: '' as any,
    IsPercentage: false,
    MaxDiscountAmount: '' as any,
    MaxUsageCount: '' as any,
    MaxUsagePerUser: '' as any,
    IsFirstOrderOnly: false,
    IsNewUserOnly: false,
    StartDate: '',
    EndDate: '',
    IsActive: true,
    ApplicableProductIds: [] as number[]
  });

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.get<Product[]>('/api/products');
        setProducts(res.data);
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const resetForm = () => {
    setForm({
      Code: '',
      Description: '',
      DiscountAmount: '',
      MinimumOrderValue: '',
      IsPercentage: false,
      MaxDiscountAmount: '',
      MaxUsageCount: '',
      MaxUsagePerUser: '',
      IsFirstOrderOnly: false,
      IsNewUserOnly: false,
      StartDate: '',
      EndDate: '',
      IsActive: true,
      ApplicableProductIds: []
    });
    setFormError(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (c: ApiCoupon) => {
    setEditing(c);
    setForm({
      Code: c.Code || '',
      Description: c.Description || '',
      DiscountAmount: (c.DiscountAmount as any) ?? '',
      MinimumOrderValue: (c.MinimumOrderValue as any) ?? '',
      IsPercentage: !!c.IsPercentage,
      MaxDiscountAmount: (c.MaxDiscountAmount as any) ?? '',
      MaxUsageCount: (c.MaxUsageCount as any) ?? '',
      MaxUsagePerUser: (c.MaxUsagePerUser as any) ?? '',
      IsFirstOrderOnly: !!c.IsFirstOrderOnly,
      IsNewUserOnly: !!c.IsNewUserOnly,
      StartDate: c.StartDate ? String(c.StartDate).slice(0, 10) : '',
      EndDate: c.EndDate ? String(c.EndDate).slice(0, 10) : '',
      IsActive: !!c.IsActive,
      ApplicableProductIds: Array.isArray(c.ApplicableProductIds) ? c.ApplicableProductIds : []
    });
    setFormError(null);
    setModalOpen(true);
  };

  useEffect(() => {
    if (form.IsPercentage && form.DiscountAmount !== '' && Number(form.DiscountAmount) > 100) {
      setForm(v => ({ ...v, DiscountAmount: 100 }));
    }
    if (Number(form.DiscountAmount) < 0) {
      setForm(v => ({ ...v, DiscountAmount: 0 }));
    }
  }, [form.IsPercentage]);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resActive = await api.get<ApiCoupon[]>('/api/coupons/active');
      const data = Array.isArray(resActive.data) ? resActive.data : [];
      setCoupons(data);
      return data;
    } catch (e) {
      console.error('Error fetching coupons:', e);
      setError('Failed to load coupons');
      setCoupons([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const filtered = useMemo(() => {
    const now = new Date();
    const statusOf = (c: ApiCoupon): 'active' | 'expired' | 'scheduled' | 'inactive' => {
      const start = c.StartDate ? new Date(c.StartDate) : null;
      const end = c.EndDate ? new Date(c.EndDate) : null;
      if (!c.IsActive) return 'inactive';
      if (start && now < start) return 'scheduled';
      if (end && now > end) return 'expired';
      return 'active';
    };

    const result = coupons
      .filter((c) => {
        const matchesQuery = !query || c.Code.toLowerCase().includes(query.toLowerCase()) || (c.Description || '').toLowerCase().includes(query.toLowerCase());
        const st = statusOf(c);
        const matchesStatus = statusFilter === 'all' || st === statusFilter;
        return matchesQuery && matchesStatus;
      });

    if (sortBy === 'code') {
      result.sort((a, b) => a.Code.localeCompare(b.Code));
    } else if (sortBy === 'startDate') {
      result.sort((a, b) => new Date(a.StartDate || 0).getTime() - new Date(b.StartDate || 0).getTime());
    } else if (sortBy === 'discountDesc') {
      result.sort((a, b) => (b.DiscountAmount || 0) - (a.DiscountAmount || 0));
    }
    return result;
  }, [coupons, query, statusFilter, sortBy]);

  const discountLabel = (c: ApiCoupon) => (c.IsPercentage ? `${c.DiscountAmount}%` : `₹${c.DiscountAmount}`);
  const typeLabel = (c: ApiCoupon) => (c.IsPercentage ? 'percentage' : 'fixed');
  const validityLabel = (c: ApiCoupon) =>
    c.StartDate && c.EndDate ? `${c.StartDate?.slice(0, 10)} – ${c.EndDate?.slice(0, 10)}` : '—';
  const statusBadge = (c: ApiCoupon) => {
    const now = new Date();
    const start = c.StartDate ? new Date(c.StartDate) : null;
    const end = c.EndDate ? new Date(c.EndDate) : null;
    let status: 'active' | 'expired' | 'scheduled' | 'inactive' = 'active';
    if (!c.IsActive) status = 'inactive';
    else if (start && now < start) status = 'scheduled';
    else if (end && now > end) status = 'expired';

    const cls =
      status === 'active'
        ? 'bg-green-100 text-green-800'
        : status === 'expired'
        ? 'bg-red-100 text-red-800'
        : status === 'scheduled'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-800';
    return { status, cls };
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
            <p className="text-gray-500">Manage discount codes and promotions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              + New Coupon
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 w-full">
              <input
                placeholder="Search coupons..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full md:max-w-xs rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
              </select>
              <select
                className="hidden md:block rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="code">Sort: Code</option>
                <option value="startDate">Sort: Start Date</option>
                <option value="discountDesc">Sort: Discount (high→low)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{error}</div>
          )}

          {/* Desktop/Table view */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      <svg className="animate-spin h-5 w-5 inline text-gray-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No coupons found</td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const badge = statusBadge(c);
                    return (
                      <tr key={c.Id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{c.Code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{discountLabel(c)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 capitalize">{typeLabel(c)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{validityLabel(c)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                            {badge.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/coupons/${c.Id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              <span className="hidden lg:inline">View</span>
                            </Link>
                            <button
                              onClick={() => openEdit(c)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-8 8l9-9a2.121 2.121 0 113 3l-9 9H6v-3z" /></svg>
                              <span className="hidden lg:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => { setDeleteError(null); setConfirmDeleteId(c.Id); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001-1V5a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 001 1m-8 0h10" /></svg>
                              <span className="hidden lg:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile/Card view */}
          <div className="md:hidden">
            {loading ? (
              <div className="px-4 py-10 text-center text-gray-500">
                <svg className="animate-spin h-5 w-5 inline text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500">No coupons found</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const badge = statusBadge(c);
                  return (
                    <li key={c.Id} className="p-4">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 shadow-sm p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{c.Code}</h3>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.status}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-700 line-clamp-2">{c.Description || 'No description'}</div>
                          <div className="mt-3 space-y-1 text-sm">
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-500">Type:</span>
                              <span className="text-gray-900 font-medium capitalize">{typeLabel(c)}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-500">Discount:</span>
                              <span className="text-gray-900 font-medium">{discountLabel(c)}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-500">Validity:</span>
                              <span className="text-gray-900 font-medium whitespace-nowrap">{validityLabel(c)}</span>
                            </div>
                            {typeof c.MinimumOrderValue === 'number' && c.MinimumOrderValue > 0 && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500">Min:</span>
                                <span className="text-gray-900 font-medium">₹{c.MinimumOrderValue}</span>
                              </div>
                            )}
                            {typeof c.MaxDiscountAmount === 'number' && c.MaxDiscountAmount > 0 && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500">Max Discount:</span>
                                <span className="text-gray-900 font-medium">₹{c.MaxDiscountAmount}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {c.IsFirstOrderOnly && <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px]">First Order</span>}
                            {c.IsNewUserOnly && <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px]">New User</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/coupons/${c.Id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              View
                            </Link>
                            <button
                              onClick={() => openEdit(c)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-8 8l9-9a2.121 2.121 0 113 3l-9 9H6v-3z" /></svg>
                              Edit
                            </button>
                            <button
                              onClick={() => { setDeleteError(null); setConfirmDeleteId(c.Id); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001-1V5a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 001 1m-8 0h10" /></svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
            <div className="relative bg-white w-full h-full rounded-none p-0 md:h-auto md:max-w-2xl md:rounded-2xl md:border md:border-gray-100 md:p-6 md:shadow-xl overflow-hidden flex flex-col">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 md:p-0 md:mb-4 border-b border-gray-100 md:border-0 bg-white">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
                <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {formError && (
                <div className="mx-4 md:mx-0 mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFormError(null);
                  const code = form.Code.trim().toUpperCase();
                  if (!code) { setFormError('Code is required'); return; }
                  if (coupons.some(c => c.Code?.toUpperCase() === code && c.Id !== (editing?.Id ?? -1))) {
                    setFormError('Code already exists');
                    return;
                  }
                  if (form.DiscountAmount === '' || isNaN(Number(form.DiscountAmount))) { setFormError('Discount amount is required'); return; }
                  if (form.MaxDiscountAmount === '' || isNaN(Number(form.MaxDiscountAmount))) { setFormError('Max discount amount is required'); return; }
                  if (form.MaxUsageCount === '' || isNaN(Number(form.MaxUsageCount))) { setFormError('Max usage count is required'); return; }
                  if (form.MaxUsagePerUser === '' || isNaN(Number(form.MaxUsagePerUser))) { setFormError('Max usage per user is required'); return; }
                  if (form.MinimumOrderValue === '' || isNaN(Number(form.MinimumOrderValue))) { setFormError('Minimum order value is required'); return; }
                  if (!form.StartDate) { setFormError('Start date is required'); return; }
                  if (!form.ApplicableProductIds || form.ApplicableProductIds.length === 0) { setFormError('At least one product must be selected'); return; }
                  const disc = Math.max(0, Number(form.DiscountAmount));
                  if (form.IsPercentage && (disc < 0 || disc > 100)) { setFormError('Percentage discount must be between 0 and 100'); return; }
                  const mov = Math.max(0, Number(form.MinimumOrderValue || 0));
                  const maxDisc = Math.max(0, Number(form.MaxDiscountAmount || 0));
                  const maxUsage = Math.max(0, Number(form.MaxUsageCount || 0));
                  const maxPerUser = Math.max(0, Number(form.MaxUsagePerUser || 0));
                  try {
                    setSubmitting(true);
                    const payload = {
                      Id: 0,
                      Code: code,
                      Description: form.Description?.trim() || '',
                      DiscountAmount: form.IsPercentage ? Math.min(100, disc) : disc,
                      MinimumOrderValue: mov,
                      IsPercentage: !!form.IsPercentage,
                      MaxDiscountAmount: maxDisc,
                      MaxUsageCount: maxUsage,
                      MaxUsagePerUser: maxPerUser,
                      IsFirstOrderOnly: !!form.IsFirstOrderOnly,
                      IsNewUserOnly: !!form.IsNewUserOnly,
                      StartDate: form.StartDate,
                      EndDate: form.EndDate || undefined,
                      IsActive: !!form.IsActive,
                      ApplicableProductIds: form.ApplicableProductIds || []
                    };
                    if (editing) {
                      await api.put(`/api/coupons/${editing.Id}`, payload);
                    } else {
                      const createdRes = await api.post<ApiCoupon>('/api/coupons', payload);
                      const created = createdRes.data;

                      setCoupons((prev) => {
                        const next = [created, ...prev.filter((c) => c.Id !== created.Id)];
                        return next;
                      });

                      const refreshed = await fetchCoupons();
                      setCoupons([created, ...refreshed.filter((c) => c.Id !== created.Id)]);
                      setModalOpen(false);
                      resetForm();
                      return;
                    }
                    setModalOpen(false);
                    resetForm();
                    await fetchCoupons();
                  } catch (err: any) {
                    const serverData = err?.response?.data;
                    const serverText = typeof serverData === 'string' ? serverData : '';
                    const serverMessage =
                      typeof serverData === 'string'
                        ? null
                        : (serverData?.message || serverData?.title || serverData?.error || null);

                    if (serverText.toLowerCase().includes('coupon code must be unique')) {
                      setFormError('Code already exists');
                      return;
                    }

                    if (serverMessage) {
                      setFormError(String(serverMessage));
                      return;
                    }

                    setFormError(editing ? 'Failed to update coupon' : 'Failed to create coupon');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="space-y-4 overflow-y-auto px-4 py-4 md:p-0 flex-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required
                      value={form.Code} 
                      onChange={(e) => {
                        const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        setForm(v => ({ ...v, Code: sanitized }));
                      }} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" 
                      pattern="[A-Z0-9]+"
                      title="Only uppercase letters and numbers are allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input 
                      value={form.Description} 
                      onChange={(e) => setForm(v => ({ ...v, Description: e.target.value }))} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={form.DiscountAmount}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (isNaN(n)) { setForm(v => ({ ...v, DiscountAmount: '' } as any)); return; }
                        const clamped = Math.max(0, form.IsPercentage ? Math.min(100, n) : n);
                        setForm(v => ({ ...v, DiscountAmount: clamped }));
                      }}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {form.IsPercentage && <div className="mt-1 text-xs text-gray-500">0–100%</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Order Value <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min={0} 
                      required
                      value={form.MinimumOrderValue} 
                      onChange={(e) => setForm(v => ({ ...v, MinimumOrderValue: Math.max(0, Number(e.target.value)) as any }))} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Discount Amount <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min={0} 
                      required
                      value={form.MaxDiscountAmount} 
                      onChange={(e) => setForm(v => ({ ...v, MaxDiscountAmount: Math.max(0, Number(e.target.value)) as any }))} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Usage Count <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min={0} 
                      required
                      value={form.MaxUsageCount} 
                      onChange={(e) => setForm(v => ({ ...v, MaxUsageCount: Math.max(0, Number(e.target.value)) as any }))} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Usage Per User <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min={0} 
                      required
                      value={form.MaxUsagePerUser} 
                      onChange={(e) => setForm(v => ({ ...v, MaxUsagePerUser: Math.max(0, Number(e.target.value)) as any }))} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Applicable Products <span className="text-red-500">*</span>
                    </label>
                    <Select
                      mode="multiple"
                      placeholder={loadingProducts ? 'Loading products...' : 'Select products...'}
                      value={form.ApplicableProductIds}
                      onChange={(selectedIds: number[]) => {
                        setForm(v => ({ ...v, ApplicableProductIds: selectedIds }));
                      }}
                      options={products.map(product => ({
                        value: product.ProductID,
                        label: `${product.ProductName} (ID: ${product.ProductID})`,
                      }))}
                      loading={loadingProducts}
                      optionFilterProp="label"
                      showSearch
                      allowClear
                      className="w-full [&_.ant-select-selector]:min-h-[42px] [&_.ant-select-selection-overflow]:gap-2 [&_.ant-select-selection-item]:bg-blue-50 [&_.ant-select-selection-item]:border-blue-100 [&_.ant-select-selection-item]:text-blue-700 [&_.ant-select-selection-item]:rounded-full"
                      dropdownStyle={{
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '8px 0',
                      }}
                      dropdownRender={(menu) => (
                        <div>
                          <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-100">Available Products</div>
                          <div className="p-1">
                            {menu}
                          </div>
                        </div>
                      )}
                      tagRender={(props) => {
                        const { label, closable, onClose } = props;
                        const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
                          event.preventDefault();
                          event.stopPropagation();
                        };
                        return (
                          <Tag
                            color="blue"
                            onMouseDown={onPreventMouseDown}
                            closable={closable}
                            onClose={onClose}
                            className="inline-flex items-center text-xs py-0.5 px-2.5 m-0"
                            style={{ marginRight: 0 }}
                          >
                            {label}
                          </Tag>
                        );
                      }}
                      popupClassName="[&_.ant-select-item-option-selected]:bg-blue-50 [&_.ant-select-item-option-active]:bg-gray-50"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      {form.ApplicableProductIds.length > 0 
                        ? `${form.ApplicableProductIds.length} product(s) selected` 
                        : 'Search and select products'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      required
                      value={form.StartDate} 
                      onChange={(e) => setForm(v => ({ ...v, StartDate: e.target.value }))} 
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" value={form.EndDate} onChange={(e) => setForm(v => ({ ...v, EndDate: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="isPercentage" type="checkbox" checked={form.IsPercentage} onChange={(e) => setForm(v => ({ ...v, IsPercentage: e.target.checked }))} className="rounded border-gray-300" />
                    <label htmlFor="isPercentage" className="text-sm text-gray-700">Is Percentage</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="isActive" type="checkbox" checked={form.IsActive} onChange={(e) => setForm(v => ({ ...v, IsActive: e.target.checked }))} className="rounded border-gray-300" />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="firstOnly" type="checkbox" checked={form.IsFirstOrderOnly} onChange={(e) => setForm(v => ({ ...v, IsFirstOrderOnly: e.target.checked }))} className="rounded border-gray-300" />
                    <label htmlFor="firstOnly" className="text-sm text-gray-700">First Order Only</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="newUserOnly" type="checkbox" checked={form.IsNewUserOnly} onChange={(e) => setForm(v => ({ ...v, IsNewUserOnly: e.target.checked }))} className="rounded border-gray-300" />
                    <label htmlFor="newUserOnly" className="text-sm text-gray-700">New User Only</label>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 md:border-0 md:pt-2 px-4 md:px-0 py-3 md:py-0 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 w-full md:w-auto">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 w-full md:w-auto">
                    {submitting ? (editing ? 'Updating...' : 'Saving...') : (editing ? 'Update Coupon' : 'Save Coupon')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDeleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDeleteId(null)} />
            <div className="relative bg-white w-full max-w-sm mx-4 rounded-2xl shadow-xl border border-gray-100 p-5">
              <h3 className="text-lg font-semibold text-gray-900">Delete coupon?</h3>
              <p className="mt-1 text-sm text-gray-600">This action cannot be undone.</p>
              {deleteError && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{deleteError}</div>}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50"
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={deleting}
                >Cancel</button>
                <button
                  className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                  onClick={async () => {
                    if (confirmDeleteId === null) return;
                    try {
                      setDeleting(true);
                      setDeleteError(null);
                      await api.delete(`/api/coupons/${confirmDeleteId}`);
                      setConfirmDeleteId(null);
                      await fetchCoupons();
                    } catch (e) {
                      setDeleteError('Failed to delete coupon');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                >{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
