"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import styles from "./demo.module.css";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: Record<string, number>;
};
const products: Product[] = [
  {
    id: 1,
    name: "Classic Cotton T-shirt",
    category: "T-shirts",
    price: 899,
    stock: { S: 8, M: 14, L: 10, XL: 4 },
  },
  {
    id: 2,
    name: "Oxford Everyday Shirt",
    category: "Shirts",
    price: 1499,
    stock: { S: 3, M: 9, L: 12, XL: 6 },
  },
  {
    id: 3,
    name: "Straight Fit Jeans",
    category: "Jeans",
    price: 1999,
    stock: { 30: 4, 32: 11, 34: 7, 36: 2 },
  },
  {
    id: 4,
    name: "Tailored Trousers",
    category: "Trousers",
    price: 1799,
    stock: { 30: 5, 32: 8, 34: 6, 36: 3 },
  },
  {
    id: 5,
    name: "Lightweight Field Jacket",
    category: "Jackets",
    price: 3299,
    stock: { M: 4, L: 6, XL: 2 },
  },
];

export default function InteractiveDemo() {
  const [tab, setTab] = useState<"catalogue" | "inventory" | "reports">("catalogue");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const filtered = products.filter((p) =>
    `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );
  const total = useMemo(
    () => products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0),
    [cart]
  );
  const units = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const adjust = (id: number, delta: number) =>
    setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  return (
    <main className={styles.page}>
      <header>
        <Link href="/">
          <ArrowLeftOutlined /> Back to Stockiva
        </Link>
        <strong>
          <span />
          Stockiva Demo
        </strong>
        <button
          onClick={() => {
            setCart({});
            setSearch("");
            setTab("catalogue");
          }}
        >
          <ReloadOutlined /> Reset Demo
        </button>
      </header>
      <section className={styles.notice}>
        <b>Simulated demo</b> — Nothing here affects a real store, customer, payment or inventory
        record.
      </section>
      <div className={styles.shell}>
        <aside>
          <div>
            <ShopOutlined />
            <b>Meadow Clothing</b>
            <small>Sample store</small>
          </div>
          {[
            ["catalogue", <ShoppingCartOutlined key="c" />, "Products & cart"],
            ["inventory", <ShopOutlined key="i" />, "Size-wise stock"],
            ["reports", <BarChartOutlined key="r" />, "Sample reports"],
          ].map(([key, icon, label]) => (
            <button
              className={tab === key ? styles.active : ""}
              onClick={() => setTab(key as typeof tab)}
              key={key as string}
            >
              {icon}
              {label}
            </button>
          ))}
        </aside>
        <section className={styles.workspace}>
          {tab === "catalogue" && (
            <>
              <div className={styles.workspaceHead}>
                <div>
                  <small>Sample catalogue</small>
                  <h1>Build a simulated bill</h1>
                </div>
                <label>
                  <SearchOutlined />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products"
                  />
                </label>
              </div>
              <div className={styles.catalogueLayout}>
                <div className={styles.products}>
                  {filtered.map((p, i) => (
                    <article key={p.id}>
                      <div className={`${styles.productArt} ${styles[`art${i + 1}`]}`}>
                        <span>{p.category.slice(0, 1)}</span>
                      </div>
                      <small>{p.category}</small>
                      <h2>{p.name}</h2>
                      <b>₹{p.price.toLocaleString("en-IN")}</b>
                      <p>{Object.values(p.stock).reduce((a, b) => a + b, 0)} units in stock</p>
                      <button onClick={() => adjust(p.id, 1)}>
                        Add to cart <PlusOutlined />
                      </button>
                    </article>
                  ))}
                </div>
                <aside className={styles.cart}>
                  <h2>
                    Sample cart <span>{units}</span>
                  </h2>
                  {units === 0 ? (
                    <p className={styles.empty}>Add a product to see a simulated checkout.</p>
                  ) : (
                    products
                      .filter((p) => cart[p.id])
                      .map((p) => (
                        <div className={styles.cartRow} key={p.id}>
                          <div>
                            <b>{p.name}</b>
                            <small>₹{p.price.toLocaleString("en-IN")}</small>
                          </div>
                          <div>
                            <button
                              onClick={() => adjust(p.id, -1)}
                              aria-label={`Remove one ${p.name}`}
                            >
                              <MinusOutlined />
                            </button>
                            <span>{cart[p.id]}</span>
                            <button
                              onClick={() => adjust(p.id, 1)}
                              aria-label={`Add one ${p.name}`}
                            >
                              <PlusOutlined />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                  <div className={styles.total}>
                    <span>Simulated total</span>
                    <b>₹{total.toLocaleString("en-IN")}</b>
                  </div>
                  <button
                    disabled={!units}
                    onClick={() =>
                      window.alert("Demo only — no payment or transaction was created.")
                    }
                  >
                    Preview checkout
                  </button>
                </aside>
              </div>
            </>
          )}
          {tab === "inventory" && (
            <>
              <div className={styles.workspaceHead}>
                <div>
                  <small>Sample inventory</small>
                  <h1>Size-wise stock</h1>
                </div>
              </div>
              <div className={styles.stockTable}>
                <div className={styles.stockHeader}>
                  <b>Product</b>
                  <b>Category</b>
                  <b>Sizes and units</b>
                  <b>Status</b>
                </div>
                {products.map((p) => {
                  const sum = Object.values(p.stock).reduce((a, b) => a + b, 0);
                  return (
                    <div key={p.id}>
                      <b>{p.name}</b>
                      <span>{p.category}</span>
                      <span className={styles.sizePills}>
                        {Object.entries(p.stock).map(([s, q]) => (
                          <i key={s}>
                            {s}: {q}
                          </i>
                        ))}
                      </span>
                      <em className={sum < 18 ? styles.low : styles.good}>
                        {sum < 18 ? "Low stock" : "In stock"}
                      </em>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tab === "reports" && (
            <>
              <div className={styles.workspaceHead}>
                <div>
                  <small>Sample reports</small>
                  <h1>Weekly sales snapshot</h1>
                </div>
              </div>
              <div className={styles.reportCards}>
                {[
                  ["Net sales", "₹1,84,620", "+12%"],
                  ["Orders", "326", "+8%"],
                  ["Average bill", "₹566", "+3%"],
                ].map(([l, v, m]) => (
                  <article key={l}>
                    <small>{l}</small>
                    <strong>{v}</strong>
                    <em>{m} vs last week</em>
                  </article>
                ))}
              </div>
              <div className={styles.reportChart}>
                <h2>Sales by day</h2>
                <div>
                  {[45, 62, 54, 78, 67, 91, 73].map((h, i) => (
                    <span key={i}>
                      <i style={{ height: `${h}%` }} />
                      <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</small>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
