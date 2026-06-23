import Link from "next/link";
import { getProject } from "@/lib/api";
import type { Project } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  let project: Project | null = null;
  let error: string | null = null;

  try {
    project = await getProject(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load project";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "48px 32px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "40px",
          fontSize: "13px",
          color: "#555",
        }}
      >
        <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
          LoopForge
        </Link>
        <span>/</span>
        <span style={{ color: "#e8e8e8" }}>{project?.name ?? id}</span>
      </nav>

      {error && (
        <div
          style={{
            background: "#1a0a0a",
            border: "1px solid #3a1a1a",
            borderRadius: "8px",
            padding: "16px",
            color: "#f87171",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {project && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "40px",
              gap: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  color: "#f0f0f0",
                  letterSpacing: "-0.02em",
                  marginBottom: "6px",
                }}
              >
                {project.name}
              </h1>
              <p
                style={{
                  fontSize: "12px",
                  color: "#444",
                  fontFamily: "monospace",
                }}
              >
                {project.repoPath}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
              <Link
                href={`/projects/${id}/graph`}
                style={{
                  background: "#1a1a1a",
                  color: "#e8e8e8",
                  padding: "9px 18px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  border: "1px solid #2a2a2a",
                }}
              >
                Knowledge graph
              </Link>
              <Link
                href={`/projects/${id}/vision`}
                style={{
                  background: "#1a1a1a",
                  color: "#e8e8e8",
                  padding: "9px 18px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  border: "1px solid #2a2a2a",
                }}
              >
                Visual analysis
              </Link>
              <Link
                href={`/projects/${id}/evals`}
                style={{
                  background: "#1a1a1a",
                  color: "#e8e8e8",
                  padding: "9px 18px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  border: "1px solid #2a2a2a",
                }}
              >
                Evals
              </Link>
              <Link
                href={`/projects/${id}/goals`}
                style={{
                  background: "#1a1a1a",
                  color: "#e8e8e8",
                  padding: "9px 18px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  border: "1px solid #2a2a2a",
                }}
              >
                Goals
              </Link>
              <Link
                href={`/projects/${id}/releases`}
                style={{
                  background: "#1a1a1a",
                  color: "#e8e8e8",
                  padding: "9px 18px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  border: "1px solid #2a2a2a",
                }}
              >
                Releases
              </Link>
              <Link
                href={`/projects/${id}/session`}
                style={{
                  background: "#f0f0f0",
                  color: "#0a0a0a",
                  padding: "9px 18px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                New session →
              </Link>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard label="Project ID" value={project.id} mono />
            {project.createdAt && (
              <StatCard
                label="Connected"
                value={new Date(project.createdAt).toLocaleDateString()}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <p style={{ fontSize: "11px", color: "#555", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <p
        style={{
          fontSize: "14px",
          color: "#e8e8e8",
          fontFamily: mono ? "monospace" : "inherit",
          wordBreak: "break-all",
        }}
      >
        {value}
      </p>
    </div>
  );
}
