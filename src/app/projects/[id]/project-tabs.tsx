"use client";

import { useState } from "react";
import HubsTab from "./tabs/hubs-tab";
import NeedsTab from "./tabs/needs-tab";
import DonationsTab from "./tabs/donations-tab";
import LogisticsTab from "./tabs/logistics-tab";
import IncidentsTab from "./tabs/incidents-tab";
import VolunteersTab from "./tabs/volunteers-tab";
import OverviewTab from "./tabs/overview-tab";

interface ProjectTabsProps {
    projectId: string;
    canManage: boolean;
    isMaster: boolean;
    userId: string;
}

const TABS = [
    { key: "overview", label: "Visão Geral", icon: "📊" },
    { key: "hubs", label: "Hubs", icon: "📍" },
    { key: "needs", label: "Demandas", icon: "📋" },
    { key: "donations", label: "Doações", icon: "📦" },
    { key: "logistics", label: "Logística", icon: "🚛" },
    { key: "incidents", label: "Incidentes", icon: "⚠️" },
    { key: "volunteers", label: "Voluntários", icon: "🤝" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProjectTabs({
    projectId,
    canManage,
    isMaster,
    userId,
}: ProjectTabsProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("overview");

    return (
        <>
            {/* Tab Navigation */}
            <div className="tabs-nav">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === "overview" && <OverviewTab projectId={projectId} canManage={canManage} />}
                {activeTab === "hubs" && (
                    <HubsTab projectId={projectId} canManage={canManage} userId={userId} />
                )}
                {activeTab === "needs" && (
                    <NeedsTab projectId={projectId} canManage={canManage} userId={userId} />
                )}
                {activeTab === "donations" && (
                    <DonationsTab projectId={projectId} canManage={canManage} userId={userId} />
                )}
                {activeTab === "logistics" && (
                    <LogisticsTab projectId={projectId} canManage={canManage} userId={userId} />
                )}
                {activeTab === "incidents" && (
                    <IncidentsTab projectId={projectId} canManage={canManage} userId={userId} />
                )}
                {activeTab === "volunteers" && (
                    <VolunteersTab projectId={projectId} canManage={canManage} isMaster={isMaster} userId={userId} />
                )}
            </div>
        </>
    );
}


