"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, List, Result, Space, Spin, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text } = Typography;
type Readiness = { overallStatus: "READY"|"ACTION_REQUIRED"|"SETUP_IN_PROGRESS"|"NOT_CONNECTED"; purpose: string; checks: Array<{ key:string; label:string; passed:boolean; reason?:string; recommendedAction?:string; href?:string }>; blockingReasons:string[]; recommendedActions:Array<{label:string;href:string}> };
export default function WhatsAppReadinessPage() {
  const router = useRouter(); const [data,setData]=useState<Readiness>(); const [loading,setLoading]=useState(true); const [error,setError]=useState(false);
  const load=useCallback(async()=>{setLoading(true);setError(false);try{const r=await fetch("/api/whatsapp/readiness?purpose=TRANSACTIONAL",{cache:"no-store"});if(!r.ok)throw new Error();setData(await r.json() as Readiness);}catch{setError(true);}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const badge=data?.overallStatus==="READY"?"CONNECTED":data?.overallStatus==="ACTION_REQUIRED"?"ACTION_REQUIRED":"PENDING";
  return <WhatsAppShell activeKey="readiness" status={<WhatsAppStatusBadge state={badge}/>}>{loading?<Surface><Spin/></Surface>:error||!data?<Surface><Alert type="error" showIcon message="Messaging readiness could not be evaluated" action={<Button icon={<ReloadOutlined/>} onClick={()=>void load()}>Retry</Button>}/></Surface>:<>
    <Surface>{data.overallStatus==="READY"?<Result status="success" title="WhatsApp messaging is ready" subTitle="The complete transactional sending path is configured for this organization."/>:<Result status="warning" title={data.overallStatus==="ACTION_REQUIRED"?"Meta action required":"Messaging setup is incomplete"} subTitle={data.blockingReasons[0]} extra={data.recommendedActions[0]&&<Button type="primary" onClick={()=>router.push(data.recommendedActions[0]!.href)}>{data.recommendedActions[0].label}</Button>}/>}</Surface>
    <Surface><Title level={4}>Readiness checks</Title><List dataSource={data.checks} locale={{emptyText:<Empty/>}} renderItem={check=><List.Item actions={!check.passed&&check.href?[<Button key="action" onClick={()=>router.push(check.href!)}>{check.recommendedAction}</Button>]:undefined}><List.Item.Meta avatar={check.passed?<CheckCircleOutlined style={{color:"#52c41a",fontSize:22}}/>:<CloseCircleOutlined style={{color:"#fa8c16",fontSize:22}}/>} title={<Space>{check.label}<Tag color={check.passed?"green":"orange"}>{check.passed?"READY":"BLOCKED"}</Tag></Space>} description={check.passed?"Requirement satisfied":check.reason}/></List.Item>}/></Surface>
    {data.overallStatus!=="READY"&&<Card><Text type="secondary">Unavailable messaging actions remain disabled until every required check passes. Each blocking check above explains the reason and links to its configuration page.</Text></Card>}
  </>}</WhatsAppShell>;
}
