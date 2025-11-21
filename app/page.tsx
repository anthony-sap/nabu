import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { NabuHeader } from "@/components/nabu/nabu-header";
import { NabuMobileNav } from "@/components/nabu/nabu-mobile-nav";

export default function NabuLanding() {
  return (
    <div className="min-h-screen bg-[#0a1428] text-white selection:bg-[#00B3A6]/30">
      {/* Brand tokens */}
      <style>{`
        :root{
          --nabu-mint:#00B3A6; --nabu-deep:#071633; --nabu-lapis:#1E40AF; --nabu-gold:#C59B2F; --nabu-clay:#E7DCC7;
        }
        .glass{ backdrop-filter:saturate(140%) blur(10px); background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); }
      `}</style>

      {/* NAV */}
      <NabuMobileNav />
      <NabuHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[42rem] w-[42rem] rounded-full bg-[var(--nabu-mint)]/10 blur-3xl"/>
        <div className="absolute -bottom-24 -right-24 h-[36rem] w-[36rem] rounded-full bg-[var(--nabu-lapis)]/20 blur-3xl"/>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="bg-[var(--nabu-mint)]/10 text-[var(--nabu-mint)] border-[var(--nabu-mint)]/30 hover:bg-[var(--nabu-mint)]/15">
              The modern scribe for your thinking
            </Badge>
            <h1 className="mt-6 text-5xl sm:text-6xl font-serif leading-tight">
              Capture a thought. <span className="text-[var(--nabu-mint)]">Nabu</span> will sort the rest.
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-xl">A feed-first notes app that auto-tags your thoughts, groups them by clients and projects, and drafts concise AI overviews you can trust.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" rounded="2xl" asChild className="bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-lg shadow-[#00B3A6]/20">
                <a href="#cta">Start free trial</a>
              </Button>
              <Button variant="outline" size="lg" rounded="2xl" asChild className="border-white/15 hover:bg-white/5 hover:border-white/35 text-white">
                <a href="#demo">See 2‑minute demo</a>
              </Button>
            </div>
            <div className="mt-6 text-sm text-white/60">No credit card. Your notes encrypted at rest.</div>
          </div>

          {/* Hero mock panel */}
          <Card className="glass rounded-3xl border-white/10 shadow-xl bg-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white/70">Today • Feed</div>
                <Button size="sm" rounded="full" variant="secondary" className="bg-white/10 hover:bg-white/15 text-white border-0">
                  Suggest tags
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  {t:'Call with HydroChem — next steps', tags:['client','meeting','follow‑up']},
                  {t:'Idea: "Ledger" view for weekly summaries', tags:['product','idea','ui']},
                  {t:'Email draft: scope for mobile sync', tags:['proposal','mobile','sync']}
                ].map((n,i)=> (
                  <div key={i} className="rounded-2xl border border-white/5 p-4 bg-white/5">
                    <div className="font-medium">{n.t}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {n.tags.map((tg,ix)=> (
                        <span key={ix} className="px-2 py-1 rounded-full text-xs bg-[var(--nabu-mint)]/15 text-[var(--nabu-mint)] border border-[var(--nabu-mint)]/20">{tg}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="text-white/70 mb-2">AI Overview</div>
                <div className="rounded-xl bg-[#0f1b34] p-4 border border-white/5">
                  <p className="text-white/85">You have 3 actions across 2 clients. Prioritise HydroChem follow‑up, then draft scope for mobile sync. New idea tagged <em>Ledger</em> aligns with your weekly summary workflow.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-8 border-t border-white/5 bg-[#0c1831]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-6 justify-between text-white/60">
          <span>Encrypted at rest</span>
          <span>Tag suggestions powered by on-device models + cloud</span>
          <span>Exports: PDF • Word • Markdown</span>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-serif">Why people switch to Nabu</h2>
          <p className="mt-2 text-white/70 max-w-2xl">Folders behave like tags, a feed that thinks, and summaries that read like you.</p>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {h:'Feed‑first capture', d:'Jot short or long. Nabu auto‑structures it later.'},
              {h:'Smart tags', d:'Instant suggestions for people, clients, projects, and topics.'},
              {h:'Overviews', d:'Concise AI briefs with links back to source notes.'},
              {h:'Views that fit you', d:'Feed, Ledger, Timeline, and Client notebooks.'},
              {h:'Share or keep private', d:'One click to share with teammates, or keep personal.'},
              {h:'Fast search', d:'Semantic + keyword so you actually find things.'}
            ].map((f,i)=> (
              <Card key={i} className="glass rounded-2xl border-white/10 bg-transparent">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-xl bg-[var(--nabu-mint)]/20 border border-[var(--nabu-mint)]/30 flex items-center justify-center text-[var(--nabu-mint)]">★</div>
                  <h3 className="mt-4 text-xl font-semibold text-white">{f.h}</h3>
                  <p className="mt-2 text-white/70">{f.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-[#0c1831] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-serif">From jot → tagged → overview</h2>
          <div className="mt-12 grid lg:grid-cols-3 gap-6">
            {[
              {step:'1', h:'Jot', d:'Drop a quick note in your feed. Text, audio, or paste.'},
              {step:'2', h:'Suggest', d:'Nabu proposes tags and related notes. Accept or edit.'},
              {step:'3', h:'Brief', d:'A two‑minute overview summarises decisions and actions.'}
            ].map((s,i)=> (
              <Card key={i} className="glass rounded-2xl border-white/10 bg-transparent">
                <CardContent className="p-6 flex flex-col gap-3">
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/15 text-white border-0 w-fit">
                    Step {s.step}
                  </Badge>
                  <h3 className="text-xl font-semibold text-white">{s.h}</h3>
                  <p className="text-white/70">{s.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO / CTA */}
      <section id="demo" className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-serif text-white">See it in action</h2>
            <p className="mt-2 text-white/70">Run a mini demo using your own text. We&apos;ll tag it and create a quick brief in seconds.</p>
            <Card className="mt-6 glass rounded-2xl border-white/10 bg-transparent">
              <CardContent className="p-4">
                <Textarea 
                  className="w-full h-40 bg-transparent border-0 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none" 
                  placeholder="Paste a few bullet points, a meeting snippet, or an idea..."
                />
                <div className="mt-3 flex gap-3">
                  <Button size="lg" rounded="2xl" className="bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-lg shadow-[#00B3A6]/20">
                    Suggest tags
                  </Button>
                  <Button variant="outline" size="lg" rounded="2xl" className="border-white/15 hover:bg-white/5 hover:border-white/35 text-white">
                    Make brief
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="glass rounded-3xl border-white/10 bg-transparent">
            <CardContent className="p-6">
              <div className="text-white/70 mb-3">Preview</div>
              <div className="grid gap-3">
                <div className="rounded-xl bg-white/5 p-4 border border-white/5 text-white">#client • #proposal • #next‑steps</div>
                <div className="rounded-xl bg-white/5 p-4 border border-white/5 text-white">Brief: Prioritise mobile sync, outline risks, confirm budget guardrails.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-[#0c1831] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-serif">Simple pricing</h2>
          <p className="mt-2 text-white/70">Start free. Upgrade when you&apos;re ready.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              {name:'Free', price:'$0', blurb:'Personal projects', feats:['Unlimited notes','AI tag suggestions','1 client notebook','Export Markdown']},
              {name:'Pro', price:'$12', highlight:true, blurb:'Consultants & founders', feats:['All Free features','Client notebooks unlimited','AI overviews','Word/PDF exports','Priority support']},
              {name:'Teams', price:'$18', blurb:'Agencies & teams', feats:['Shared workspaces','Permissions','SSO (Kinde/Auth0)','Admin controls']}
            ].map((p,i)=> (
              <Card key={i} className={`rounded-3xl border-2 ${(p.highlight?'border-[var(--nabu-mint)] shadow-lg shadow-[var(--nabu-mint)]/20':'border-white/10')} glass bg-transparent`}>
                <CardContent className="p-6">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                    {p.highlight && (
                      <Badge className="bg-[var(--nabu-mint)]/20 text-[var(--nabu-mint)] border-[var(--nabu-mint)]/30 hover:bg-[var(--nabu-mint)]/25">
                        Most popular
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 text-4xl font-serif text-white">{p.price}<span className="text-base text-white/60">/mo</span></div>
                  <p className="mt-2 text-white/70">{p.blurb}</p>
                  <ul className="mt-4 space-y-2 text-white/80">
                    {p.feats.map((f,ix)=> (<li key={ix}>✓ {f}</li>))}
                  </ul>
                  <Button 
                    size="lg" 
                    rounded="2xl" 
                    className={`mt-6 w-full ${p.highlight ? 'bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-lg shadow-[#00B3A6]/20' : 'bg-white/5 hover:bg-white/10 border border-white/15 text-white'}`}
                  >
                    Choose {p.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-serif">Questions, answered</h2>
          <div className="mt-8 divide-y divide-white/10">
            {[
              {q:'How are tags suggested?', a:'We blend on-device models with secure cloud inference. Your raw notes never train third‑party models.'},
              {q:'Can I import from other apps?', a:'Yes. Import Markdown, Notion CSV, Apple Notes archive, and Evernote ENEX.'},
              {q:'Do you support clients/projects?', a:'Yes. Notes can belong to many tags; "Client Notebooks" are saved views with permissions.'},
              {q:'Is my data private?', a:'Yes. Notes are encrypted at rest. You control sharing per notebook.'}
            ].map((f,i)=> (
              <Card key={i} className="glass rounded-2xl mb-3 border-white/10 bg-transparent overflow-hidden">
                <details className="group">
                  <summary className="cursor-pointer font-medium p-5 text-white hover:bg-white/5 transition-colors list-none flex items-center justify-between">
                    <span>{f.q}</span>
                    <span className="transform transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="px-5 pb-5">
                    <p className="text-white/70">{f.a}</p>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="cta" className="py-24 bg-gradient-to-b from-[#0a1428] to-[#0c1831] border-t border-white/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-serif text-white">Remember better. Decide faster.</h2>
          <p className="mt-3 text-white/70">Start with the mint icon version of Nabu and see how much clearer your week becomes.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button size="lg" rounded="2xl" asChild className="bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-xl shadow-[#00B3A6]/30">
              <a href="#">Start free</a>
            </Button>
            <Button variant="outline" size="lg" rounded="2xl" asChild className="border-white/15 hover:bg-white/5 hover:border-white/35 text-white">
              <a href="#demo">Watch demo</a>
            </Button>
          </div>
          <div className="mt-4 text-sm text-white/50">Free trial • No credit card • Cancel anytime</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[var(--nabu-deep)] relative">
            <img src="/logo.png" alt="Nabu" className="absolute inset-0 m-2 fill-[var(--nabu-mint)]"/>

            </div>
            <span>Nabu</span>
          </div>
          <div className="text-sm">© {new Date().getFullYear()} Nabu. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

