"use client";

import { FormEvent, useRef, useState } from "react";
import { Profile, ProfileAccount, ProfileTag, SheetReport } from "@/lib/types";
import { api } from "@/lib/basePath";

const SHEET_STATUS: Record<SheetReport["status"], string> = {
  checking: "Checking…",
  done: "Checked",
  failed: "Failed",
  needs_fixing: "Needs fixing",
};

type Props = {
  profile: Profile;
  sheets: SheetReport[];
  onChanged: () => Promise<void> | void;
  onView: (sheetId: string) => void;
};

export default function AccountsPanel({ profile, sheets, onChanged, onView }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tagName, setTagName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountTag, setAccountTag] = useState(profile.default_tag_id);
  const uploadFor = useRef<string>("");
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (request: () => Promise<Response>) => {
    setBusy(true);
    setError("");
    try {
      const res = await request();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? "That did not work. Try again.");
        return false;
      }
      await onChanged();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const json = (method: string, path: string, body?: unknown) => () =>
    fetch(api(path), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const addTag = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(json("POST", "/api/tags", { name: tagName }))) setTagName("");
  };

  const addAccount = async (event: FormEvent) => {
    event.preventDefault();
    const tagId = profile.tags.some((t) => t.tag_id === accountTag) ? accountTag : profile.default_tag_id;
    if (await run(json("POST", "/api/accounts", { name: accountName, tag_id: tagId }))) setAccountName("");
  };

  const renameTag = (tag: ProfileTag) => {
    const name = window.prompt("New name for this tag", tag.name)?.trim();
    if (name && name !== tag.name) run(json("PATCH", `/api/tags/${tag.tag_id}`, { name }));
  };

  const deleteTag = (tag: ProfileTag, count: number) => {
    const note = count ? ` Its ${count} account${count === 1 ? "" : "s"} will move to the default tag.` : "";
    if (window.confirm(`Delete the tag "${tag.name}"?${note}`)) run(json("DELETE", `/api/tags/${tag.tag_id}`));
  };

  const renameAccount = (account: ProfileAccount) => {
    const name = window.prompt("New name for this account", account.name)?.trim();
    if (name && name !== account.name) run(json("PATCH", `/api/accounts/${account.account_id}`, { name }));
  };

  const deleteAccount = (account: ProfileAccount, count: number) => {
    const note = count ? ` Its ${count} uploaded file${count === 1 ? "" : "s"} will be deleted too.` : "";
    if (window.confirm(`Delete the account "${account.name}"?${note}`)) {
      run(json("DELETE", `/api/accounts/${account.account_id}`));
    }
  };

  const pickFile = (accountId: string) => {
    uploadFor.current = accountId;
    fileInput.current?.click();
  };

  const upload = async (files: FileList | null) => {
    const accountId = uploadFor.current;
    for (const file of Array.from(files ?? [])) {
      const ok = await run(async () => {
        const base = `/api/accounts/${accountId}/sheets?name=${encodeURIComponent(file.name)}`;
        const response = await fetch(api(base), { method: "POST", body: file });
        const error = await response.clone().json().catch(() => null);
        if (response.status !== 400 || !String(error?.error?.message ?? "").toLowerCase().includes("choose whether to keep or discard")) return response;
        const choice = window.prompt("This CSV has labels from an older upload. Type KEEP to preserve them hidden for later review, or DISCARD to remove them.");
        if (!choice || !["keep", "discard"].includes(choice.trim().toLowerCase())) return response;
        return fetch(api(`${base}&feedback_policy=${choice.trim().toLowerCase()}`), { method: "POST", body: file });
      });
      if (!ok) break;
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const deleteSheet = (sheet: SheetReport) => {
    if (!sheet.account_id || !window.confirm(`Delete ${sheet.name}?`)) return;
    run(json("DELETE", `/api/accounts/${sheet.account_id}/sheets?name=${encodeURIComponent(sheet.name)}`));
  };

  const tags = [...profile.tags].sort(
    (a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name)
  );

  return (
    <section className="panel">
      <h2 className="panelTitle">Accounts</h2>
      <div className="panelBody accounts">
        {error && <p className="formMessage error" role="alert">{error}</p>}
        <input ref={fileInput} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => upload(e.target.files)} />

        {tags.map((tag) => {
          const accounts = profile.accounts
            .filter((account) => account.tag_id === tag.tag_id)
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <div key={tag.tag_id} className="tagGroup">
              <div className="tagHead">
                <strong>{tag.name}</strong>
                {tag.is_default && <span className="hint">default tag</span>}
                <span className="spacer" />
                <button className="linkButton" onClick={() => renameTag(tag)} disabled={busy}>Rename</button>
                {!tag.is_default && (
                  <button className="linkButton" onClick={() => deleteTag(tag, accounts.length)} disabled={busy}>Delete</button>
                )}
              </div>

              {accounts.length === 0 && <p className="hint">No accounts in this tag.</p>}
              {accounts.map((account) => {
                const files = sheets.filter((sheet) => sheet.account_id === account.account_id);
                return (
                  <div key={account.account_id} className="account">
                    <div className="accountHead">
                      <span className="accountName">{account.name}</span>
                      <span className="spacer" />
                      {tags.length > 1 && (
                        <label className="filter">
                          Tag
                          <select
                            value={account.tag_id}
                            disabled={busy}
                            onChange={(e) => run(json("PATCH", `/api/accounts/${account.account_id}`, { tag_id: e.target.value }))}
                          >
                            {tags.map((t) => <option key={t.tag_id} value={t.tag_id}>{t.name}</option>)}
                          </select>
                        </label>
                      )}
                      <button className="aquaButton small" onClick={() => pickFile(account.account_id)} disabled={busy}>
                        Upload CSV
                      </button>
                      <button className="linkButton" onClick={() => renameAccount(account)} disabled={busy}>Rename</button>
                      <button className="linkButton" onClick={() => deleteAccount(account, files.length)} disabled={busy}>Delete</button>
                    </div>
                    {files.length === 0 ? (
                      <p className="hint">No files yet. Upload a CSV of this account&apos;s purchases to check it for fraud.</p>
                    ) : (
                      <ul className="files">
                        {files.map((sheet) => (
                          <li key={sheet.sheet_id}>
                            <button className="linkButton" onClick={() => onView(sheet.sheet_id)}>{sheet.name}</button>
                            {sheet.status !== "done" ? (
                              <span className={`badge ${sheet.status === "checking" ? "info" : "high"}`}>{SHEET_STATUS[sheet.status]}</span>
                            ) : (
                              <>
                                {sheet.totals.fraud > 0 && <span className="badge high">{sheet.totals.fraud} possible fraud</span>}
                                {sheet.totals.suspicious > 0 && <span className="badge mid">{sheet.totals.suspicious} suspicious</span>}
                                {sheet.totals.fraud + sheet.totals.suspicious === 0 && <span className="badge low">Nothing flagged</span>}
                              </>
                            )}
                            <span className="spacer" />
                            <button className="linkButton" onClick={() => deleteSheet(sheet)} disabled={busy}>Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="addRow">
          <form onSubmit={addAccount}>
            <input
              aria-label="New account name"
              placeholder="New account, e.g. Checking"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              maxLength={80}
              required
            />
            {tags.length > 1 && (
              <select aria-label="Tag for the new account" value={accountTag} onChange={(e) => setAccountTag(e.target.value)}>
                {tags.map((t) => <option key={t.tag_id} value={t.tag_id}>{t.name}</option>)}
              </select>
            )}
            <button className="aquaButton" disabled={busy}>Add Account</button>
          </form>
          <form onSubmit={addTag}>
            <input
              aria-label="New tag name"
              placeholder="New tag, e.g. Business"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              maxLength={80}
              required
            />
            <button className="aquaButton" disabled={busy}>Add Tag</button>
          </form>
        </div>
      </div>
    </section>
  );
}
