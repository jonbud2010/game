import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock the AuthContext
const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const createMockAuthContext = () => ({
  user: null,
  isAuthenticated: false,
  login: mockLogin,
  logout: vi.fn(),
  register: vi.fn(),
  isLoading: false
});

// Wrapper component to provide router context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Set up the mock for this render
  mockUseAuth.mockReturnValue(createMockAuthContext());

  return (
    <MemoryRouter initialEntries={['/login']}>
      {children}
    </MemoryRouter>
  );
};

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form elements', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Translation keys are rendered directly due to global mock

    // Check elements render with translation keys  
    expect(screen.getByText('⚽ buttons.login')).toBeInTheDocument();
    expect(screen.getByText('pages.login.welcome_back')).toBeInTheDocument();
    expect(screen.getByLabelText('forms.email')).toBeInTheDocument();
    expect(screen.getByLabelText('forms.password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'buttons.login' })).toBeInTheDocument();
  });

  it('should render registration link', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Translation keys are rendered directly due to global mock

    expect(screen.getByText('pages.login.no_account')).toBeInTheDocument();
    expect(screen.getByText('buttons.register')).toBeInTheDocument();
    
    const registerLink = screen.getByText('buttons.register').closest('a');
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('should update input values when user types', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('forms.password') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('should call login function with correct credentials on form submit', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email');
    const passwordInput = screen.getByLabelText('forms.password');
    const submitButton = screen.getByRole('button', { name: 'buttons.login' });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('should navigate to home page after successful login', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email');
    const passwordInput = screen.getByLabelText('forms.password');
    const submitButton = screen.getByRole('button', { name: 'buttons.login' });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show loading state during login attempt', async () => {
    // Mock login to never resolve to keep loading state
    mockLogin.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email');
    const passwordInput = screen.getByLabelText('forms.password');
    const submitButton = screen.getByRole('button', { name: 'buttons.login' });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    // Check if button shows loading state (would use translation key)
    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/.*\.\.\.|status\.loading/);
      expect(submitButton).toBeDisabled();
    });

    // Check if inputs are disabled during loading
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

  it('should display error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValue(new Error(errorMessage));

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email');
    const passwordInput = screen.getByLabelText('forms.password');
    const submitButton = screen.getByRole('button', { name: 'buttons.login' });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Check that loading state is reset
    expect(submitButton).not.toBeDisabled();
    expect(submitButton).toHaveTextContent('buttons.login');
  });

  it('should display generic error message for non-Error exceptions', async () => {
    mockLogin.mockRejectedValue('String error');

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email');
    const passwordInput = screen.getByLabelText('forms.password');
    const submitButton = screen.getByRole('button', { name: 'buttons.login' });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      // Should show generic error translation key
      expect(screen.getByText('auth.login_failed')).toBeInTheDocument();
    });
  });

  it('should clear error message when form is resubmitted', async () => {
    // First submission fails
    mockLogin.mockRejectedValueOnce(new Error('First error'));
    // Second submission succeeds
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('forms.email');
    const passwordInput = screen.getByLabelText('forms.password');
    const submitButton = screen.getByRole('button', { name: 'buttons.login' });

    // First submission
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    // Second submission
    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should require email field', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('forms.email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should require password field', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText('forms.password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByLabelText('forms.email')).toBeInTheDocument();
      expect(screen.getByLabelText('forms.password')).toBeInTheDocument();
    });

    it('should associate error messages with form', async () => {
      mockLogin.mockRejectedValue(new Error('Test error'));

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('forms.email');
      const passwordInput = screen.getByLabelText('forms.password');
      const submitButton = screen.getByRole('button', { name: 'buttons.login' });
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const errorMessage = screen.getByText('Test error');
        expect(errorMessage).toHaveClass('error-message');
      });
    });
  });
});