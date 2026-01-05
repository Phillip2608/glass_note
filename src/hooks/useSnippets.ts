import { useState, useEffect, useMemo } from 'react';
import type { Snippet } from '../types';
import { useSettings } from './useSettings';

export const useSnippets = () => {
    const { settings } = useSettings();

    // Manual Snippets
    const [savedSnippets, setSavedSnippets] = useState<Snippet[]>(() => {
        const saved = localStorage.getItem('glass-note-snippets');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('glass-note-snippets', JSON.stringify(savedSnippets));
    }, [savedSnippets]);

    // Generated Snippets from Accounting Data
    const generatedSnippets = useMemo(() => {
        if (!settings.accountingData) return [];

        const lines = settings.accountingData.split('\n');
        const shortcuts: Snippet[] = [];
        const seenTriggers = new Set<string>();

        // Email Regex
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

        lines.forEach(line => {
            // Basic Tab Separation from Excel
            // But user might have spaces or messy data.
            // Strategy: Look for Name (first part) and Email (regex anywhere in line)

            const emailMatches = line.match(emailRegex);
            if (!emailMatches || emailMatches.length === 0) return;

            // Assuming Name is the first "column" or whatever text is before the emails
            // Defaulting to simple split by tab for name if available, else usage might vary.
            // Given the prompt "Name | Email", let's split by TAB first.
            const parts = line.split('\t');
            let nameRaw = parts[0].trim();

            // If name is empty (or line was not tab separated properly/just spaces), use the part before the email?
            // Let's stick to the prompt implication: "Excel paste" -> Tab separated.
            if (!nameRaw) return;

            // Slugify Name
            // Remove accents, special chars, spaces -> underscore
            const slug = nameRaw
                .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric (except space)
                .trim()
                .replace(/\s+/g, '_'); // Space to underscore

            if (!slug) return;

            const trigger = `email_${slug}`;

            // Avoid duplicates
            if (seenTriggers.has(trigger)) return;
            seenTriggers.add(trigger);

            // Join multiple emails with "; " or just space?
            // User Request: "/email_ebenezer" -> bring email or emails
            // We return unique emails found in the line
            const uniqueEmails = Array.from(new Set(emailMatches));
            const content = uniqueEmails.join('\n');

            shortcuts.push({ trigger, content });
        });

        return shortcuts;
    }, [settings.accountingData]);

    // Combine for consumption
    const snippets = useMemo(() => {
        return [...savedSnippets, ...generatedSnippets];
    }, [savedSnippets, generatedSnippets]);

    const addSnippet = (trigger: string, content: string) => {
        // Prevent overwriting generated ones? Or allow manual override?
        // For now, check both.
        if (snippets.some(s => s.trigger === trigger)) return false;
        setSavedSnippets([...savedSnippets, { trigger, content }]);
        return true;
    };

    const removeSnippet = (trigger: string) => {
        // Can only remove manual snippets
        setSavedSnippets(savedSnippets.filter(s => s.trigger !== trigger));
    };

    return { snippets, addSnippet, removeSnippet };
};
