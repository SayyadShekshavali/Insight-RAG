import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import User from '../modules/users/user.model.js';
import Org from '../modules/orgs/org.model.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const SEED_USERS = [
  { email: 'admin1@insightrag.dev', role: 'admin' },
  { email: 'admin2@insightrag.dev', role: 'admin' },
  { email: 'admin3@insightrag.dev', role: 'admin' },
  { email: 'employee1@insightrag.dev', role: 'employee' },
  { email: 'employee2@insightrag.dev', role: 'employee' }
];

export async function seedDatabase() {
  try {
    // 1. Create or Find the Organizations
    const orgNames = [
      'Insight RAG Dev Org 1',
      'Insight RAG Dev Org 2',
      'Insight RAG Dev Org 3'
    ];
    const orgs = [];
    for (const name of orgNames) {
      let org = await Org.findOne({ name });
      if (!org) {
        org = new Org({
          name,
          domainAllowlist: ['insightrag.dev'],
          settings: { dataRetentionDays: 90 }
        });
        await org.save();
        logger.info(`Created seed organization: ${name}`);
      }
      orgs.push(org);
    }

    const createdCredentials = [];
    let usersCreated = false;

    // Delete old default org if exists to clean up
    await Org.deleteOne({ name: 'Insight RAG Dev Org' });

    const SEED_USERS_WITH_ORGS = [
      { email: 'admin1@insightrag.dev', role: 'admin', orgIdx: 0 },
      { email: 'admin2@insightrag.dev', role: 'admin', orgIdx: 1 },
      { email: 'admin3@insightrag.dev', role: 'admin', orgIdx: 2 },
      { email: 'employee1@insightrag.dev', role: 'employee', orgIdx: 0 },
      { email: 'employee2@insightrag.dev', role: 'employee', orgIdx: 1 }
    ];

    // Delete existing users so we can re-create them with correct org mappings
    for (const seed of SEED_USERS_WITH_ORGS) {
      const existingUser = await User.findOne({ email: seed.email });
      if (existingUser) {
        const targetOrgId = orgs[seed.orgIdx]._id.toString();
        if (!existingUser.orgId || existingUser.orgId.toString() !== targetOrgId) {
          logger.info(`Deleting existing user ${seed.email} to map to separated org.`);
          await User.deleteOne({ email: seed.email });
        }
      }
    }

    // Seed default users if they don't exist
    for (const seed of SEED_USERS_WITH_ORGS) {
      const existingUser = await User.findOne({ email: seed.email });
      if (!existingUser) {
        // Generate strong password
        const rawPassword = crypto.randomBytes(12).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(rawPassword, salt);

        const targetOrg = orgs[seed.orgIdx];
        const newUser = new User({
          email: seed.email,
          passwordHash,
          role: seed.role,
          orgId: targetOrg._id,
          status: 'active'
        });

        await newUser.save();
        createdCredentials.push({ email: seed.email, password: rawPassword, role: seed.role, orgName: targetOrg.name });
        usersCreated = true;
      }
    }

    if (usersCreated) {
      // Write to .seed-credentials.txt
      const credsPath = path.join(process.cwd(), '.seed-credentials.txt');
      let fileContent = `===========================================================\n`;
      fileContent += `SEED ACCOUNTS FOR INSIGHT RAG (GENERATED AT: ${new Date().toISOString()})\n`;
      fileContent += `===========================================================\n\n`;
      
      createdCredentials.forEach(cred => {
        fileContent += `Email:        ${cred.email}\n`;
        fileContent += `Password:     ${cred.password}\n`;
        fileContent += `Role:         ${cred.role}\n`;
        fileContent += `Organization: ${cred.orgName}\n`;
        fileContent += `-----------------------------------------------------------\n`;
      });

      fs.writeFileSync(credsPath, fileContent, 'utf8');

      // Print once to console
      logger.info('*** DATABASE SEEDED WITH SEPARATED ACCOUNTS ***');
      console.log('\n' + fileContent);
      logger.info(`Credentials saved to: ${credsPath}`);
    } else {
      logger.info('Database seeding skipped: Seed accounts already exist and are correctly isolated.');
    }
  } catch (error) {
    logger.error(`Database seeding error: ${error.message}`);
  }
}
