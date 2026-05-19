import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('ZamanSepeti smoke flows', () => {
  beforeEach(() => {
    localStorage.clear();
    history.pushState({}, '', '/');
  });

  it('ana sayfada marka, sıcak talepler, çözüm verenler ve Maya footer görünür', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Zekan var, zamanın yok' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sıcak Talepler' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Çözüm Verenler' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Akıllı İşler' })).toBeInTheDocument();
    expect(screen.getByText('zamansepeti.org bir Maya Elektronik Bilişim markasıdır.')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/Tüm Talepleri Gör · 5 aktif/)).toBeInTheDocument());
  });

  it('akıllı kategori filtresinde süresi geçmiş talepleri listelemez', async () => {
    history.pushState({}, '', '/ilanlar?grup=smart');
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sıcak Talepler' })).toBeInTheDocument());
    expect(screen.queryByText('Expired örnek: eski sosyal medya içerik paketi')).not.toBeInTheDocument();
    expect(screen.getByText('AI ile yatırım sunumumu 12 slayta indirgemem gerekiyor')).toBeInTheDocument();
  });

  it('süresi geçmiş talep detayında teklif formu yerine kapalı mesajı gösterir', async () => {
    history.pushState({}, '', '/ilanlar/l-6');
    render(<App />);

    await waitFor(() => expect(screen.getByText('Bu talebin süresi dolmuş.')).toBeInTheDocument());
    expect(screen.getByText('Bu talebe teklif verilemez.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Teklif Gönder/ })).not.toBeInTheDocument();
  });

  it('giriş ve kayıt sayfaları karşılıklı geçiş mikrocopylerini gösterir', async () => {
    history.pushState({}, '', '/giris');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Giriş' })).toBeInTheDocument();
    expect(screen.getByText('Hesabın yok mu?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kayıt ol' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kayıt Ol' })).toBeInTheDocument());
    expect(screen.getByText('Zaten hesabın var mı?')).toBeInTheDocument();
  });

  it('teklif kabul edildiğinde kabul edilen teklif açık mesajı, reddedilen teklif sansürlü mesajı gösterir', async () => {
    history.pushState({}, '', '/ilanlar/l-2');
    localStorage.setItem('zamansepeti-current-user', 'u-current');
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Teklifler' })).toBeInTheDocument());
    const offersRegion = screen.getByRole('heading', { name: 'Teklifler' }).parentElement!;
    expect(within(offersRegion).getByText(/Merhaba, \*\*\*/)).toBeInTheDocument();
    expect(within(offersRegion).queryByText(/test@example.com/)).not.toBeInTheDocument();
  });
});
