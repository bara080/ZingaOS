'use client';

import { useState } from 'react';
import { useCampaigns } from '../hooks/use-campaigns';
import { CreateCampaignForm } from './create-campaign-form';
import { CampaignStatusBadge } from './campaign-status-badge';
import { Campaign } from '../types/campaign.types';

export function CampaignListing() {
  const { campaigns, loading, error, createCampaign, sendCampaign, deleteCampaign } =
    useCampaigns();
  const [showForm, setShowForm] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSend(campaign: Campaign) {
    if (
      !window.confirm(
        `Send "${campaign.title}" to ${campaign.recipientCount.toLocaleString()} recipients?`,
      )
    )
      return;

    setSendingId(campaign._id);
    setActionError(null);
    try {
      await sendCampaign(campaign._id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setSendingId(null);
    }
  }

  async function handleDelete(campaign: Campaign) {
    if (!window.confirm(`Delete draft "${campaign.title}"?`)) return;
    try {
      await deleteCampaign(campaign._id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">
        Loading campaigns…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Email campaigns
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Create and send bulk emails to customers or service providers.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          + New campaign
        </button>
      </div>

      {/* Error banner */}
      {(error || actionError) && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
          {error ?? actionError}
        </div>
      )}

      {/* Table */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
          No campaigns yet. Create your first one above.
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Audience
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Recipients
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Sent at
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {campaigns.map((campaign) => (
                <tr
                  key={campaign._id}
                  className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {campaign.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">
                      {campaign.subject}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 capitalize">
                    {campaign.audienceType}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {campaign.status === 'sent' ? (
                      <span>
                        {campaign.sentCount.toLocaleString()}
                        {campaign.failedCount > 0 && (
                          <span className="text-red-500 ml-1">({campaign.failedCount} failed)</span>
                        )}
                      </span>
                    ) : (
                      <span>{campaign.recipientCount.toLocaleString()} est.</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {campaign.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSend(campaign)}
                            disabled={sendingId === campaign._id}
                            className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium transition-colors"
                          >
                            {sendingId === campaign._id ? 'Sending…' : 'Send'}
                          </button>
                          <button
                            onClick={() => handleDelete(campaign)}
                            className="px-3 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-red-600 hover:border-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {campaign.status === 'failed' && (
                        <button
                          onClick={() => handleSend(campaign)}
                          className="px-3 py-1 text-xs rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <CreateCampaignForm
          onSubmit={(input) => createCampaign(input).then(() => undefined)}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
