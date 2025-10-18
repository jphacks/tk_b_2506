import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from './SettingsPanel';

const mockGetUserIntroductions = vi.fn();
const mockUpdateIntroduction = vi.fn();
const mockCreateIntroduction = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('lib/supabase', () => ({
    db: {
        getUserIntroductions: mockGetUserIntroductions,
        updateIntroduction: mockUpdateIntroduction,
        createIntroduction: mockCreateIntroduction
    },
    supabase: {
        auth: {
            signInWithPassword: mockSignInWithPassword,
            updateUser: mockUpdateUser
        }
    }
}));

vi.mock('components/ui/Toast', () => ({
    default: ({ message, type, isVisible }) => {
        if (!isVisible) {
            return null;
        }
        return <div data-testid="toast">{`${type}:${message}`}</div>;
    }
}));

describe('SettingsPanel', () => {
    const baseUser = {
        id: 'user-1',
        email: 'user@example.com'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and displays existing introduction data', async () => {
        mockGetUserIntroductions.mockResolvedValueOnce([{
            id: 'intro-1',
            name: 'Alice Nakano',
            affiliation: 'Sympo Labs',
            interests: 'Networking',
            one_liner: 'よろしくお願いします！',
            conference_id: 'conf-1',
            is_public: true
        }]);

        render(
            <SettingsPanel
                isOpen
                onClose={vi.fn()}
                onLogout={vi.fn()}
                user={baseUser}
            />
        );

        await waitFor(() => expect(mockGetUserIntroductions).toHaveBeenCalledWith('user-1'));
        await waitFor(() => expect(screen.getByLabelText('お名前')).toHaveValue('Alice Nakano'));
        expect(screen.getByLabelText('所属')).toHaveValue('Sympo Labs');
        expect(screen.getByLabelText('興味・関心')).toHaveValue('Networking');
        expect(screen.getByLabelText('一言コメント')).toHaveValue('よろしくお願いします！');
    });

    it('updates an existing introduction when the form is submitted', async () => {
        mockGetUserIntroductions.mockResolvedValueOnce([{
            id: 'intro-2',
            name: 'Taro',
            affiliation: '',
            interests: '',
            one_liner: '',
            conference_id: null,
            is_public: true
        }]);
        mockUpdateIntroduction.mockResolvedValueOnce({});

        const user = userEvent.setup();

        render(
            <SettingsPanel
                isOpen
                onClose={vi.fn()}
                onLogout={vi.fn()}
                user={baseUser}
            />
        );

        const nameInput = await screen.findByLabelText('お名前');
        await user.clear(nameInput);
        await user.type(nameInput, 'Taro Yamada');

        const commentInput = screen.getByLabelText('一言コメント');
        await user.type(commentInput, 'Hello Symposium');

        const saveButton = screen.getByRole('button', { name: '自己紹介を保存' });
        await user.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateIntroduction).toHaveBeenCalledWith('intro-2', expect.objectContaining({
                name: 'Taro Yamada',
                one_liner: 'Hello Symposium',
                is_public: true,
                conference_id: null
            }));
        });
    });

    it('updates password via Supabase when form is submitted', async () => {
        mockGetUserIntroductions.mockResolvedValueOnce([]);
        mockSignInWithPassword.mockResolvedValueOnce({ error: null });
        mockUpdateUser.mockResolvedValueOnce({ error: null });

        const user = userEvent.setup();

        render(
            <SettingsPanel
                isOpen
                onClose={vi.fn()}
                onLogout={vi.fn()}
                user={baseUser}
            />
        );

        await waitFor(() => expect(mockGetUserIntroductions).toHaveBeenCalled());

        await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass');
        await user.type(screen.getByLabelText('新しいパスワード'), 'newpass123');
        await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'newpass123');

        await user.click(screen.getByRole('button', { name: 'パスワードを変更' }));

        await waitFor(() => {
            expect(mockSignInWithPassword).toHaveBeenCalledWith({
                email: 'user@example.com',
                password: 'oldpass'
            });
        });

        expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' });
    });

    it('delegates logout to provided handler', async () => {
        mockGetUserIntroductions.mockResolvedValueOnce([]);
        const onLogout = vi.fn().mockResolvedValue();
        const user = userEvent.setup();

        render(
            <SettingsPanel
                isOpen
                onClose={vi.fn()}
                onLogout={onLogout}
                user={baseUser}
            />
        );

        await waitFor(() => expect(mockGetUserIntroductions).toHaveBeenCalled());

        await user.click(screen.getByRole('button', { name: 'ログアウト' }));

        await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
    });
});
