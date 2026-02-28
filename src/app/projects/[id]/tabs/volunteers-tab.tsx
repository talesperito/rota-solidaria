"use client";

import { useState } from "react";
import MembersPanel from "./members-panel";
import ShiftsPanel from "./shifts-panel";

interface VolunteersTabProps {
    projectId: string;
    canManage: boolean;
    isMaster: boolean;
    userId: string;
}

export default function VolunteersTab({ projectId, canManage, isMaster, userId }: VolunteersTabProps) {
    const [subTab, setSubTab] = useState<"members" | "shifts">("members");

    return (
        <>
            <div className="sub-tabs">
                <button
                    className={`sub-tab-btn ${subTab === "members" ? "active" : ""}`}
                    onClick={() => setSubTab("members")}
                >
                    👥 Membros
                </button>
                <button
                    className={`sub-tab-btn ${subTab === "shifts" ? "active" : ""}`}
                    onClick={() => setSubTab("shifts")}
                >
                    📅 Turnos / Serviços
                </button>
            </div>

            {subTab === "members" && (
                <MembersPanel
                    projectId={projectId}
                    canManage={canManage}
                    isMaster={isMaster}
                    userId={userId}
                />
            )}
            {subTab === "shifts" && (
                <ShiftsPanel
                    projectId={projectId}
                    canManage={canManage}
                    userId={userId}
                />
            )}
        </>
    );
}
