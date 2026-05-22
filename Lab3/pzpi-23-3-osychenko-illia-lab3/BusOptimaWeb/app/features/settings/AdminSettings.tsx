import { useEffect, useState } from "react";

import { apiClient } from "@/api/client";
import { Icon, InlineError } from "@/components/ui";
import type { Language, SettingsDto } from "@/types/domain";

const defaultSettings: SettingsDto = {
  fuel_price_per_liter: 50,
  peak_hours_coefficient: 1.2,
  weekend_coefficient: 1.15,
  high_demand_threshold: 85,
  low_demand_threshold: 30,
  price_min_coefficient: 0.7,
  price_max_coefficient: 1.5,
  seasonal_coefficients: { spring: 1, summer: 1.2, autumn: 1.1, winter: 0.9 },
};

export function AdminSettings({ lang }: { lang: Language }) {
  const [form, setForm] = useState<SettingsDto>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .getSettings()
      .then((data) => setForm(data as SettingsDto))
      .catch((value) => setError(value instanceof Error ? value.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const setField = (key: keyof SettingsDto, value: number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await apiClient.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "System settings" : "Системні налаштування"}</h1>
          <p className="page-subtitle">{lang === "en" ? "Dynamic pricing parameters and coefficients" : "Параметри динамічного ціноутворення та коефіцієнти"}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Icon name="check" /> {saving ? "Saving…" : lang === "en" ? "Save" : "Зберегти"}
          </button>
        </div>
      </div>

      {error && <InlineError message={error} />}
      {saved && <div className="alert alert-ok severity"><div className="alert-body"><div className="alert-title">{lang === "en" ? "Settings saved" : "Налаштування збережено"}</div></div></div>}
      {loading ? (
        <div className="card empty">{lang === "en" ? "Loading settings…" : "Завантаження налаштувань…"}</div>
      ) : (
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-title">{lang === "en" ? "Pricing parameters" : "Параметри ціноутворення"}</div>
            <div className="grid-2" style={{ marginTop: 14 }}>
              <Field label={lang === "en" ? "Fuel price" : "Ціна пального"} value={form.fuel_price_per_liter} onChange={(value) => setField("fuel_price_per_liter", value)} />
              <Field label={lang === "en" ? "Peak coefficient" : "Коеф. піку"} value={form.peak_hours_coefficient} onChange={(value) => setField("peak_hours_coefficient", value)} />
              <Field label={lang === "en" ? "Weekend coefficient" : "Коеф. вихідного"} value={form.weekend_coefficient} onChange={(value) => setField("weekend_coefficient", value)} />
              <Field label={lang === "en" ? "High demand threshold" : "Поріг високого попиту"} value={form.high_demand_threshold} onChange={(value) => setField("high_demand_threshold", value)} />
              <Field label={lang === "en" ? "Low demand threshold" : "Поріг низького попиту"} value={form.low_demand_threshold} onChange={(value) => setField("low_demand_threshold", value)} />
              <Field label={lang === "en" ? "Min price coefficient" : "Мін. коеф. ціни"} value={form.price_min_coefficient} onChange={(value) => setField("price_min_coefficient", value)} />
              <Field label={lang === "en" ? "Max price coefficient" : "Макс. коеф. ціни"} value={form.price_max_coefficient} onChange={(value) => setField("price_max_coefficient", value)} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">{lang === "en" ? "Seasonal coefficients" : "Сезонні коефіцієнти"}</div>
            <div className="grid-2" style={{ marginTop: 14 }}>
              {Object.entries(form.seasonal_coefficients).map(([key, value]) => (
                <Field
                  key={key}
                  label={key}
                  value={value}
                  onChange={(nextValue) =>
                    setForm((current) => ({
                      ...current,
                      seasonal_coefficients: {
                        ...current.seasonal_coefficients,
                        [key]: nextValue,
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
