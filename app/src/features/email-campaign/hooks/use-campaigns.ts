import { useCallback, useEffect, useRef, useState } from 'react';
import { Campaign, CreateCampaignInput } from '../types/campaign.types';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaign');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCampaigns(data.campaigns);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5s while any campaign is in 'sending' state
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    const hasSending = campaigns.some((c) => c.status === 'sending');

    if (hasSending && !pollRef.current) {
      pollRef.current = setInterval(fetchCampaigns, 5000);
    } else if (!hasSending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [campaigns, fetchCampaigns]);

  const createCampaign = useCallback(async (input: CreateCampaignInput): Promise<Campaign> => {
    const res = await fetch('/api/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Failed to create campaign');
    }
    const data = await res.json();
    setCampaigns((prev) => [data.campaign, ...prev]);
    return data.campaign;
  }, []);

  const sendCampaign = useCallback(
    async (campaignId: string) => {
      // Optimistically mark as sending in the UI
      setCampaigns((prev) =>
        prev.map((c) => (c._id === campaignId ? { ...c, status: 'sending' } : c)),
      );

      const res = await fetch('/api/campaign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (!res.ok) {
        const err = await res.json();
        // Revert optimistic update
        await fetchCampaigns();
        throw new Error(err.error ?? 'Failed to send campaign');
      }

      // Refresh to get the final status
      await fetchCampaigns();
    },
    [fetchCampaigns],
  );

  const deleteCampaign = useCallback(
    async (campaignId: string) => {
      setCampaigns((prev) => prev.filter((c) => c._id !== campaignId));
      const res = await fetch(`/api/campaign?id=${campaignId}`, { method: 'DELETE' });
      if (!res.ok) {
        await fetchCampaigns(); // revert on failure
        throw new Error('Failed to delete campaign');
      }
    },
    [fetchCampaigns],
  );

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    sendCampaign,
    deleteCampaign,
  };
}
