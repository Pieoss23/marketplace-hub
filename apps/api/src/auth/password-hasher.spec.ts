import { hashPassword, verifyPassword } from './password-hasher';

describe('password-hasher', () => {
  it('verifies a correct password against its hash', async () => {
    const { hash, salt } = await hashPassword('correct horse battery staple');

    await expect(verifyPassword('correct horse battery staple', hash, salt)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const { hash, salt } = await hashPassword('correct horse battery staple');

    await expect(verifyPassword('wrong password', hash, salt)).resolves.toBe(false);
  });

  it('produces a different salt (and hash) for the same password each time', async () => {
    const first = await hashPassword('same password');
    const second = await hashPassword('same password');

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });
});
