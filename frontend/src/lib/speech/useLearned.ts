"use client";
import { useEffect, useState } from "react";
import { dictationsDb, onDictationsChanged } from "@/lib/local-db";
import { personalize, train, type Model } from "./learn";

const HISTORY = 500; // newest dictations to learn from: plenty for names and phrasing, trains in a few ms

/**
 * What Kelados has learned from your saved dictations (retrained when they change), as a function that fixes a phrase.
 * Returns undefined when learning is off.
 */
export function useLearned(on = true) {
  const [model, setModel] = useState<Model>(() => train([]));
  useEffect(() => {
    const load = () => dictationsDb.list().then((all) => setModel(train(all.slice(0, HISTORY).map((d) => d.text)))).catch(() => {});
    load();
    return onDictationsChanged(load);
  }, []);
  return on ? (text: string) => personalize(model, text) : undefined;
}
