import { NextResponse } from 'next/server'

export async function POST() {
  // TODO: validate auth, pull client data, call Anthropic, persist report sections
  return NextResponse.json({ message: 'Report generation not yet implemented' }, { status: 501 })
}
