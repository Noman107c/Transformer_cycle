"use client";

import { useEffect, useState } from "react";

export default function TransformerData() {
  const [transformer, setTransformer] = useState("T1");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTransformerData(transformer);
  }, [transformer]);

  const loadTransformerData = async (transformerId: string) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/json/${transformerId}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load ${transformerId}`);
      }

      const jsonData = await response.json();

      setData(Array.isArray(jsonData) ? jsonData : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load transformer data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const latestRecord =
    data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Transformer Dashboard
      </h1>

      {/* Transformer Selector */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Select Transformer
        </label>

        <select
          value={transformer}
          onChange={(e) => setTransformer(e.target.value)}
          className="border rounded px-4 py-2"
        >
          {Array.from({ length: 25 }, (_, i) => (
            <option
              key={i + 1}
              value={`T${i + 1}`}
            >
              Transformer {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-blue-600">
          Loading...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Summary */}
      {!loading && latestRecord && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-2">
              Transformer
            </h3>
            <p>{transformer}</p>
          </div>

          <div className="border rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-2">
              Total Records
            </h3>
            <p>{data.length}</p>
          </div>

          <div className="border rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-2">
              Latest Record
            </h3>
            <p>
              Row #{data.length}
            </p>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!loading && data.length > 0 && (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {Object.keys(data[0]).map((key) => (
                  <th
                    key={key}
                    className="border p-2 text-left"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.slice(0, 100).map((row, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50"
                >
                  {Object.values(row).map(
                    (value: any, i) => (
                      <td
                        key={i}
                        className="border p-2"
                      >
                        {String(value)}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div>No data found.</div>
      )}
    </div>
  );
}