"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2 } from "lucide-react"
import { ClientActions } from "./client-actions"
import { type Client } from "./create-client-dialog"

type ClientWithStats = Client & {
  invoiceCount: number
  overdueCount: number
  pendingReminders: number
  totalInvoiced: number
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export function ClientListTable({ clients, isDemo }: { clients: ClientWithStats[]; isDemo: boolean }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No hay clientes todavía</p>
        <p className="text-sm text-muted-foreground">Crea tu primer cliente para empezar</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre / Razón Social</TableHead>
          <TableHead>RUT</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Facturas</TableHead>
          <TableHead>Facturado</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id} className="cursor-pointer">
            <TableCell className="font-medium">
              <Link href={`/dashboard/clients/${client.id}`} className="hover:underline">
                {client.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">
              {client.rut || "—"}
            </TableCell>
            <TableCell>{client.contact_person || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
            <TableCell>{client.invoiceCount}</TableCell>
            <TableCell className="font-medium">
              {formatCLP(client.totalInvoiced)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {client.overdueCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {client.overdueCount} vencida{client.overdueCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {client.pendingReminders > 0 && (
                  <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-600 dark:text-orange-400">
                    {client.pendingReminders} aviso{client.pendingReminders > 1 ? "s" : ""}
                  </Badge>
                )}
                {client.overdueCount === 0 && client.pendingReminders === 0 && (
                  <span className="text-xs text-muted-foreground">OK</span>
                )}
              </div>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <ClientActions client={client} isDemo={isDemo} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
