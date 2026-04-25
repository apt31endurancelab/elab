"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { KeyRound, Copy, Save, Lock, Unlock } from "lucide-react"

type ConnectionFields = {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  shopifyDomain: string
  shopifyAdminToken: string
}

type EncryptedPayload = {
  salt: string
  iv: string
  data: string
}

const STORAGE_KEY = "elab:connections:encrypted:v1"

const initialFields: ConnectionFields = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  supabaseServiceRoleKey: "",
  shopifyDomain: "",
  shopifyAdminToken: "",
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

async function encryptConfig(config: ConnectionFields, passphrase: string): Promise<EncryptedPayload> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(config)),
  )

  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  }
}

async function decryptConfig(payload: EncryptedPayload, passphrase: string): Promise<ConnectionFields> {
  const key = await deriveKey(passphrase, base64ToBytes(payload.salt))
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.data),
  )
  const dec = new TextDecoder()
  return JSON.parse(dec.decode(new Uint8Array(decrypted))) as ConnectionFields
}

export function ConnectionsConfigForm() {
  const [fields, setFields] = useState<ConnectionFields>(initialFields)
  const [passphrase, setPassphrase] = useState("")
  const [status, setStatus] = useState("")

  const hasEncryptedConfig = useMemo(() => {
    if (typeof window === "undefined") return false
    return !!localStorage.getItem(STORAGE_KEY)
  }, [])

  const updateField = (key: keyof ConnectionFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const onSaveEncrypted = async () => {
    if (!passphrase.trim()) {
      setStatus("Add an encryption passphrase before saving.")
      return
    }

    try {
      const payload = await encryptConfig(fields, passphrase)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      setStatus("Encrypted config saved locally in this browser.")
    } catch {
      setStatus("Could not encrypt and save config.")
    }
  }

  const onLoadEncrypted = async () => {
    if (!passphrase.trim()) {
      setStatus("Add your passphrase to decrypt saved config.")
      return
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setStatus("No encrypted config found in local storage.")
      return
    }

    try {
      const parsed = JSON.parse(raw) as EncryptedPayload
      const decrypted = await decryptConfig(parsed, passphrase)
      setFields(decrypted)
      setStatus("Encrypted config decrypted and loaded.")
    } catch {
      setStatus("Invalid passphrase or corrupted encrypted config.")
    }
  }

  const onCopy = async (value: string, label: string) => {
    if (!value) {
      setStatus(`Nothing to copy for ${label}.`)
      return
    }
    await navigator.clipboard.writeText(value)
    setStatus(`${label} copied.`)
  }

  const supabaseEnvBlock = [
    `NEXT_PUBLIC_SUPABASE_URL=${fields.supabaseUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${fields.supabaseAnonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${fields.supabaseServiceRoleKey}`,
  ].join("\n")

  const shopifyEnvBlock = [
    `SHOPIFY_STORE_DOMAIN=${fields.shopifyDomain}`,
    `SHOPIFY_ADMIN_ACCESS_TOKEN=${fields.shopifyAdminToken}`,
  ].join("\n")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Connection Config Vault</CardTitle>
        </div>
        <CardDescription>
          Paste connection values, save them encrypted locally, and copy in .env format for Vars.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Field>
            <FieldLabel>Encryption passphrase</FieldLabel>
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Set a strong passphrase"
            />
          </Field>
          <Button className="self-end" onClick={onSaveEncrypted}>
            <Lock className="mr-2 h-4 w-4" />
            Save encrypted
          </Button>
          <Button variant="outline" className="self-end" onClick={onLoadEncrypted}>
            <Unlock className="mr-2 h-4 w-4" />
            Load encrypted
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-sm">Supabase Required Keys</CardTitle>
              <CardDescription>
                NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field>
                <FieldLabel>NEXT_PUBLIC_SUPABASE_URL</FieldLabel>
                <Input
                  value={fields.supabaseUrl}
                  onChange={(e) => updateField("supabaseUrl", e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                />
              </Field>
              <Field>
                <FieldLabel>NEXT_PUBLIC_SUPABASE_ANON_KEY</FieldLabel>
                <Input
                  value={fields.supabaseAnonKey}
                  onChange={(e) => updateField("supabaseAnonKey", e.target.value)}
                  placeholder="eyJ..."
                />
              </Field>
              <Field>
                <FieldLabel>SUPABASE_SERVICE_ROLE_KEY</FieldLabel>
                <Input
                  value={fields.supabaseServiceRoleKey}
                  onChange={(e) => updateField("supabaseServiceRoleKey", e.target.value)}
                  placeholder="eyJ..."
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onCopy(fields.supabaseUrl, "Supabase URL")}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy URL
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCopy(fields.supabaseAnonKey, "Supabase anon key")}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy anon key
                </Button>
                <Button size="sm" onClick={() => onCopy(supabaseEnvBlock, "Supabase .env block")}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Copy .env block
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-sm">Shopify Required Keys</CardTitle>
              <CardDescription>
                SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field>
                <FieldLabel>SHOPIFY_STORE_DOMAIN</FieldLabel>
                <Input
                  value={fields.shopifyDomain}
                  onChange={(e) => updateField("shopifyDomain", e.target.value)}
                  placeholder="your-store.myshopify.com"
                />
              </Field>
              <Field>
                <FieldLabel>SHOPIFY_ADMIN_ACCESS_TOKEN</FieldLabel>
                <Input
                  value={fields.shopifyAdminToken}
                  onChange={(e) => updateField("shopifyAdminToken", e.target.value)}
                  placeholder="shpat_..."
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onCopy(fields.shopifyDomain, "Shopify domain")}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy domain
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCopy(fields.shopifyAdminToken, "Shopify admin token")}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy token
                </Button>
                <Button size="sm" onClick={() => onCopy(shopifyEnvBlock, "Shopify .env block")}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Copy .env block
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          {status ||
            (hasEncryptedConfig
              ? "Encrypted config found in this browser."
              : "No encrypted config saved yet.")}
        </p>
      </CardContent>
    </Card>
  )
}
