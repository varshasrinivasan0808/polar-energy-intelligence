import React, { useState } from 'react'
import {
  Database,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

const DatasetCenter: React.FC = () => {
  const [fileName, setFileName] = useState('')
  const [uploaded, setUploaded] = useState(false)

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    setFileName(file.name)
    setUploaded(false)
  }

  const handleUpload = () => {
    if (!fileName) return

    setUploaded(true)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-cyan-500/10 p-3">
            <Database className="h-6 w-6 text-cyan-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Dataset Center
            </h1>

            <p className="text-sm text-slate-400">
              Manage energy and weather datasets used by the
              Polar Energy Intelligence System.
            </p>
          </div>

        </div>
      </div>

      {/* Dataset status */}
      <div className="grid gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-cyan-400" />

            <div>
              <p className="text-xs text-slate-500">
                Energy dataset
              </p>

              <p className="font-semibold text-white">
                Mawson Monthly Data
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-400" />

            <div>
              <p className="text-xs text-slate-500">
                Dataset coverage
              </p>

              <p className="font-semibold text-white">
                1986 – 2016
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />

            <div>
              <p className="text-xs text-slate-500">
                Dataset status
              </p>

              <p className="font-semibold text-emerald-400">
                Ready
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            Upload Dataset
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Upload a CSV dataset for future forecasting and
            analysis experiments.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8">

          <div className="flex flex-col items-center justify-center text-center">

            <div className="mb-4 rounded-full bg-cyan-500/10 p-4">
              <Upload className="h-7 w-7 text-cyan-400" />
            </div>

            <p className="font-medium text-slate-200">
              Select a CSV dataset
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Supported format: .csv
            </p>

            <label className="mt-5 cursor-pointer rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500">

              Choose File

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

            </label>

          </div>

        </div>

        {fileName && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <FileSpreadsheet className="h-5 w-5 text-cyan-400" />

                <div>
                  <p className="text-sm font-medium text-white">
                    {fileName}
                  </p>

                  <p className="text-xs text-slate-500">
                    Ready for upload
                  </p>
                </div>

              </div>

              <button
                onClick={handleUpload}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>

            </div>

          </div>
        )}

        {uploaded && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

            <CheckCircle2 className="h-5 w-5 text-emerald-400" />

            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Dataset uploaded
              </p>

              <p className="text-xs text-slate-500">
                The dataset is ready for processing.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Current dataset */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">

        <div className="mb-5 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-semibold text-white">
              Current Dataset
            </h2>

            <p className="text-sm text-slate-400">
              Dataset currently used by the system.
            </p>
          </div>

          <RefreshCw className="h-5 w-5 text-slate-500" />

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">

                <th className="pb-3">
                  Dataset
                </th>

                <th className="pb-3">
                  Type
                </th>

                <th className="pb-3">
                  Coverage
                </th>

                <th className="pb-3">
                  Status
                </th>

              </tr>
            </thead>

            <tbody>

              <tr className="border-b border-slate-800/60">

                <td className="py-4 font-medium text-white">
                  Mawson Energy + Weather
                </td>

                <td className="py-4 text-slate-400">
                  Monthly CSV
                </td>

                <td className="py-4 text-slate-400">
                  1986 – 2016
                </td>

                <td className="py-4">

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      {/* Important note */}
      <div className="flex gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">

        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />

        <div>
          <p className="text-sm font-semibold text-yellow-400">
            Dataset processing note
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Uploaded datasets are currently represented in the
            interface. Connecting uploads directly to model
            retraining should be treated as a separate backend
            workflow.
          </p>
        </div>

      </div>

    </div>
  )
}

export default DatasetCenter