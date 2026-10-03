"use client";

import { CheckCircleFilled, CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import styles from "./MobileCustomerSearch.module.css";

type CustomerMatch = {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
};

type Props = {
  customerName: string;
  customerPhone: string;
  onSelect: (customer: CustomerMatch) => void;
  onClear: () => void;
};

export function MobileCustomerSearch({ customerName, customerPhone, onSelect, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const selected = Boolean(customerPhone);

  useEffect(() => {
    const term = query.trim();
    const phoneSearch = /^\d+$/.test(term);
    const minLength = phoneSearch ? 3 : 2;

    if (selected || term.length < minLength) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearched(false);
      try {
        const params = new URLSearchParams();
        params.set(phoneSearch ? "phone" : "name", term);
        const response = await fetch(`/api/customers/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = response.ok ? await response.json() : [];
        setResults(Array.isArray(payload) ? payload : []);
        setSearched(true);
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setResults([]);
          setSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  if (selected) {
    return (
      <section className={styles.section} aria-label="Selected customer">
        <div className={styles.sectionTitle}>Customer</div>
        <div className={styles.selectedCard}>
          <CheckCircleFilled className={styles.check} />
          <div className={styles.identity}>
            <strong>{customerName || "Existing customer"}</strong>
            <span>{customerPhone}</span>
          </div>
          <Button aria-label="Change customer" type="text" icon={<CloseOutlined />} onClick={() => { onClear(); setQuery(""); }} />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <label className={styles.sectionTitle} htmlFor="mobile-customer-search">Customer</label>
      <Input
        id="mobile-customer-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        prefix={<SearchOutlined />}
        suffix={loading ? <Spin size="small" /> : null}
        placeholder="Search name or mobile number"
        size="large"
        autoComplete="off"
        inputMode="search"
      />
      <Typography.Text type="secondary" className={styles.hint}>
        Enter at least 2 letters or 3 digits.
      </Typography.Text>

      {results.length > 0 ? (
        <div className={styles.results} role="listbox" aria-label="Customer matches">
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              role="option"
              aria-selected="false"
              className={styles.result}
              onClick={() => {
                onSelect(customer);
                setQuery("");
                setResults([]);
              }}
            >
              <strong>{customer.name || "Unnamed customer"}</strong>
              <span>{customer.mobile}</span>
            </button>
          ))}
        </div>
      ) : searched && !loading ? (
        <div className={styles.empty}>No customers found</div>
      ) : null}
    </section>
  );
}
