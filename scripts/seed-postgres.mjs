// scripts/seed-postgres.mjs — Peuplement PostgreSQL riche pour OPT
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initialisation du seed PostgreSQL OPT ---');

  // 1. Organisation Family Office / B2B Multi-tenant
  const org = await prisma.organization.upsert({
    where: { slug: 'lemanoir-wealth' },
    update: {},
    create: {
      name: 'Lemanoir Private Wealth Management',
      slug: 'lemanoir-wealth',
      plan: 'enterprise',
      billingEmail: 'contact@lemanoir-wealth.ch',
      settings: {
        currency: 'EUR',
        whiteLabel: true,
        jurisdictionsAllowed: ['FR', 'CH', 'US', 'UK', 'LU'],
      },
    },
  });

  // 2. Utilisateur HNWI Transfrontalier
  const user = await prisma.user.upsert({
    where: { email: 'alexandre.dupont@famille-dupont.ch' },
    update: {},
    create: {
      email: 'alexandre.dupont@famille-dupont.ch',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$vJ7Wq6z2$sampleHashForDevelopmentOnly',
      firstName: 'Alexandre',
      lastName: 'Dupont',
      organizationId: org.id,
      phone: '+41 22 819 00 00',
      role: 'user',
      language: 'fr',
      kycStatus: 'verified',
    },
  });

  // 3. Résidences fiscales (Historique et statut actuel)
  await prisma.taxResidency.createMany({
    data: [
      {
        userId: user.id,
        countryCode: 'CH',
        startDate: new Date('2021-09-01'),
        isPrimary: true,
        determinationMethod: 'tie_breaker',
        confidenceScore: 0.98,
        sourceData: { canton: 'GE', municipality: 'Cologny', permits: 'Permis B' },
      },
      {
        userId: user.id,
        countryCode: 'FR',
        startDate: new Date('2010-01-01'),
        endDate: new Date('2021-08-31'),
        isPrimary: false,
        determinationMethod: 'historical',
        confidenceScore: 1.0,
      },
    ],
  });

  // 4. Portefeuille Consolidé
  const portfolio = await prisma.portfolio.create({
    data: {
      userId: user.id,
      name: 'Patrimoine Global Famille Dupont',
    },
  });

  // 5. Comptes d'actifs multi-juridictions
  const accountBoursorama = await prisma.account.create({
    data: {
      userId: user.id,
      portfolioId: portfolio.id,
      organizationId: org.id,
      provider: 'boursorama',
      name: 'PEA Boursorama (Ouvert 2017)',
      accountType: 'securities',
      currency: 'EUR',
      iban: 'FR7630004000000000000000001',
      bic: 'BOURFRPP',
      metadata: { openedYear: 2017, taxWrapper: 'PEA', isMaturedOver5Years: true },
    },
  });

  const accountIBKR = await prisma.account.create({
    data: {
      userId: user.id,
      portfolioId: portfolio.id,
      organizationId: org.id,
      provider: 'ibkr',
      name: 'Interactive Brokers US Brokerage (CTO)',
      accountType: 'securities',
      currency: 'USD',
      metadata: { formW8BEN: 'active', taxWrapper: 'compte_ordinaire', jurisdiction: 'US' },
    },
  });

  const accountPictet = await prisma.account.create({
    data: {
      userId: user.id,
      portfolioId: portfolio.id,
      organizationId: org.id,
      provider: 'pictet',
      name: 'Banque Pictet Genève (Compte Privé CHF)',
      accountType: 'banking',
      currency: 'CHF',
      iban: 'CH93002400000000000000001',
      metadata: { jurisdiction: 'CH', assetClass: 'cash' },
    },
  });

  const accountLuxAssurance = await prisma.account.create({
    data: {
      userId: user.id,
      portfolioId: portfolio.id,
      organizationId: org.id,
      provider: 'lombard_odier',
      name: 'Contrat Assurance-Vie Luxembourg (Super-Privilège)',
      accountType: 'insurance',
      currency: 'EUR',
      metadata: { taxWrapper: 'assurance_vie_lux', jurisdiction: 'LU', triangularTreaty: true },
    },
  });

  const accountImmo = await prisma.account.create({
    data: {
      userId: user.id,
      portfolioId: portfolio.id,
      organizationId: org.id,
      provider: 'manual',
      name: 'Patrimoine Immobilier France (Paris & SCPI)',
      accountType: 'real_estate',
      currency: 'EUR',
      metadata: { jurisdiction: 'FR', subjectToIFI: true },
    },
  });

  // 6. Positions (Holdings) & Lots FIFO
  // Holding 1: LVMH dans le PEA (Gain non imposable à l'IR car > 5 ans)
  const holdingLVMH = await prisma.holding.create({
    data: {
      accountId: accountBoursorama.id,
      isin: 'FR0000121014',
      assetClass: 'equity',
      assetName: 'LVMH Moët Hennessy Louis Vuitton',
      quantity: 150,
      currency: 'EUR',
      currentPrice: 820.0,
      costBasis: 75000.0, // 150 * 500€
      taxType: 'pea',
      jurisdiction: 'FR',
    },
  });

  await prisma.lot.create({
    data: {
      holdingId: holdingLVMH.id,
      acquisitionDate: new Date('2018-03-12'),
      quantity: 150,
      quantityRemaining: 150,
      pricePerUnit: 500.0,
      currency: 'EUR',
      source: 'acquisition',
    },
  });

  // Holding 2: Apple (AAPL) sur CTO IBKR
  const holdingAAPL = await prisma.holding.create({
    data: {
      accountId: accountIBKR.id,
      isin: 'US0378331005',
      assetClass: 'equity',
      assetName: 'Apple Inc.',
      quantity: 1000,
      currency: 'USD',
      currentPrice: 228.0,
      costBasis: 150000.0,
      taxType: 'compte_ordinaire',
      jurisdiction: 'US',
    },
  });

  // Deux lots FIFO pour Apple
  await prisma.lot.createMany({
    data: [
      {
        holdingId: holdingAAPL.id,
        acquisitionDate: new Date('2022-01-10'),
        quantity: 600,
        quantityRemaining: 600,
        pricePerUnit: 140.0,
        currency: 'USD',
        source: 'acquisition',
      },
      {
        holdingId: holdingAAPL.id,
        acquisitionDate: new Date('2023-06-15'),
        quantity: 400,
        quantityRemaining: 400,
        pricePerUnit: 165.0,
        currency: 'USD',
        source: 'acquisition',
      },
    ],
  });

  // Holding 3: Microsoft (MSFT) sur CTO IBKR
  const holdingMSFT = await prisma.holding.create({
    data: {
      accountId: accountIBKR.id,
      isin: 'US5949181045',
      assetClass: 'equity',
      assetName: 'Microsoft Corporation',
      quantity: 500,
      currency: 'USD',
      currentPrice: 425.0,
      costBasis: 140000.0,
      taxType: 'compte_ordinaire',
      jurisdiction: 'US',
    },
  });

  await prisma.lot.create({
    data: {
      holdingId: holdingMSFT.id,
      acquisitionDate: new Date('2022-10-20'),
      quantity: 500,
      quantityRemaining: 500,
      pricePerUnit: 280.0,
      currency: 'USD',
      source: 'acquisition',
    },
  });

  // Holding 4: Liquidités CHF chez Pictet
  await prisma.holding.create({
    data: {
      accountId: accountPictet.id,
      assetClass: 'cash',
      assetName: 'Dépôt à terme & Liquidités CHF Pictet',
      quantity: 350000,
      currency: 'CHF',
      currentPrice: 1.0,
      costBasis: 350000,
      taxType: 'compte_ordinaire',
      jurisdiction: 'CH',
    },
  });

  // Holding 5: Fonds Dédié Lux chez Lombard Odier
  await prisma.holding.create({
    data: {
      accountId: accountLuxAssurance.id,
      assetClass: 'fund',
      assetName: 'Fonds Interne Dédié (FID) Multi-Asset Lux',
      quantity: 1000,
      currency: 'EUR',
      currentPrice: 1250.0,
      costBasis: 1000000.0,
      taxType: 'assurance_vie_lux',
      jurisdiction: 'LU',
    },
  });

  // Holding 6: Immobilier Parisien (Appartement 7ème arr.)
  await prisma.holding.create({
    data: {
      accountId: accountImmo.id,
      assetClass: 'real_estate',
      assetName: 'Résidence Locative Paris 7ème (Direct)',
      quantity: 1,
      currency: 'EUR',
      currentPrice: 1450000.0,
      costBasis: 1100000.0,
      taxType: 'real_estate',
      jurisdiction: 'FR',
    },
  });

  // Holding 7: SCPI Primovie (Immobilier de santé)
  await prisma.holding.create({
    data: {
      accountId: accountImmo.id,
      isin: 'QS0002104921',
      assetClass: 'real_estate',
      assetName: 'SCPI Primovie (Parts)',
      quantity: 2000,
      currency: 'EUR',
      currentPrice: 203.0,
      costBasis: 380000.0,
      taxType: 'real_estate',
      jurisdiction: 'FR',
    },
  });

  // 7. Règles fiscales de référence (DSL)
  await prisma.taxRule.createMany({
    data: [
      {
        jurisdiction: 'FR',
        taxYear: 2026,
        ruleKey: 'FR001',
        ruleVersion: 1,
        sourceReference: 'CGI art. 200 A',
        dslYaml: 'id: FR001\ntype: rate\nrate: 0.128\ntitle: "PFU Impôt Revenu 12.8%"',
      },
      {
        jurisdiction: 'FR',
        taxYear: 2026,
        ruleKey: 'FR002',
        ruleVersion: 1,
        sourceReference: 'CSS art. L136-7',
        dslYaml: 'id: FR002\ntype: rate\nrate: 0.172\ntitle: "Prélèvements sociaux 17.2%"',
      },
      {
        jurisdiction: 'FR',
        taxYear: 2026,
        ruleKey: 'FR003',
        ruleVersion: 1,
        sourceReference: 'CGI art. 157-0 A',
        dslYaml: 'id: FR003\ntype: exemption\nrate: 1.0\ntitle: "Exonération totale PEA après 5 ans"',
      },
      {
        jurisdiction: 'FR',
        taxYear: 2026,
        ruleKey: 'FR004',
        ruleVersion: 1,
        sourceReference: 'CGI art. 965 et s.',
        dslYaml: 'id: FR004\ntype: bracket\ntitle: "Barème progressif IFI seuil 1.3M€"',
      },
    ],
  });

  // 8. Événement d'audit de sécurité
  await prisma.auditEvent.create({
    data: {
      eventType: 'SEED_INITIALIZED',
      actorId: user.id,
      actorType: 'system',
      targetType: 'portfolio',
      targetId: portfolio.id,
      payload: { note: 'Données de démonstration initialisées avec succès' },
      hash: '0x9a8f4b12c3e4d5',
    },
  });

  console.log('--- Seed PostgreSQL terminé avec succès ! ---');
  console.log(`Utilisateur : ${user.email}`);
  console.log(`Portefeuille : ${portfolio.name}`);
  console.log(`Comptes créés : 5 comptes (Boursorama, IBKR, Pictet, Lombard Odier, Immo)`);
}

main()
  .catch((e) => {
    console.error('Erreur durant le seed PostgreSQL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
