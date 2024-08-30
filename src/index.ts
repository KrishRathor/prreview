import express, { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client'
import { Octokit } from 'octokit';
import { UNABLE_TO_FIND_POSTINSTALL_TRIGGER__EMPTY_STRING } from '@prisma/client/scripts/postinstall.js';

const prisma = new PrismaClient()

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

const getBountyId = (text: string) => {
  const regex = /claim #(\S+)/i; // \S+ matches any non-whitespace characters after the #
  const match = text.match(regex);

  if (match) {
    return match[1];
  } else {
    return null;
  }
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});

app.post('/api/v1/pr', async (req: Request, res: Response) => {

  try {

    console.log('here');

    const { pull_request } = req.body;

    const title = pull_request.title;;
    const username = pull_request.user.login;
    const body = pull_request.body;
    const number = pull_request.number

    console.log('after', pull_request, title, username, body);

    const isBounty = getBountyId(body);

    console.log(isBounty);

    if (!isBounty) {
      return;
    }

    const bounty = await prisma.bounty.findFirst({ where: { id: isBounty } });
    if (!bounty) return;

    const bountyCreator = await prisma.user.findFirst({ where: { id: bounty.userId } });
    if (!bountyCreator) return;

    const token = await prisma.account.findFirst({ where: { userId: bountyCreator?.id } });
    if (!token) return;

    const solver = await prisma.solver.findFirst({ where: { githubUsername: username } });
    if (!solver) return;

    console.log(isBounty, bountyCreator, bounty, token);

    await prisma.pr.create({
      data: {
        bountyId: bounty.id,
        solverId: solver.id,
        number: number.toString()
      }
    })

  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }

})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

