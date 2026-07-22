import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  UIManager,
  TouchableWithoutFeedback,
  TextInputProps,
} from 'react-native';
import { useState, useEffect, type ComponentProps } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '@/config/firebase.config';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { FinanceTheme } from '@/constants/theme';

GoogleSignin.configure({
  webClientId: '72693471989-cv5sfbm58j41f8tv8rq40hj2h0vgf1o0.apps.googleusercontent.com',
  offlineAccess: true,
});

// ─── Validações ───────────────────────────────────────────────
function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

function validatePassword(password: string) {
  return password.trim().length >= 6;
}

// ─── Erros Firebase → mensagens amigáveis ─────────────────────
function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail.';
    case 'auth/wrong-password':
      return 'Senha incorreta. Tente novamente.';
    case 'auth/invalid-credential':
      return 'E-mail ou senha inválidos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Tente fazer login.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet.';
    case 'auth/operation-not-allowed':
      return 'O provedor de login com E-mail/Senha está desativado no console do Firebase. Ative-o em Authentication > Sign-in method.';
    default:
      return 'Ocorreu um erro. Tente novamente.';
  }
}

// ─── Tipos ────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup';

type FormFieldProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  secureEntry?: boolean;
} & TextInputProps;

// ─── Componente principal ──────────────────────────────────────
export default function AuthScreen() {
  const { signIn, themeMode } = useApp();
  const theme = FinanceTheme[themeMode];

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || (response as any).idToken;

      if (!idToken) {
        throw new Error('Não foi possível obter o Token do Google.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const u = userCredential.user;

      signIn(
        u.displayName || u.email?.split('@')[0] || 'Usuário Google',
        u.email || ''
      );
    } catch (err: any) {
      console.error('Erro no login nativo com o Google:', err);
      if (err.code === 'SIGN_IN_CANCELLED' || err.code === '12501' || err.code === 'CANCELLED') {
        // Usuário cancelou
        return;
      }
      const code = err.code || 'sem_codigo';
      const msg = err.message || firebaseErrorMessage(code);
      setError(msg);
      Alert.alert(`Erro Google Sign-In (${code})`, msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Android layout animations ─────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // ── Troca de modo login/signup ─────────────────────────────
  const switchMode = (nextMode: AuthMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  // ── Login ou Cadastro por E-mail/Senha (Firebase REAL) ─────
  const handleAuth = async () => {
    setError('');
    setSuccess('');
    Keyboard.dismiss();

    if (!validateEmail(email)) {
      setError('Digite um e-mail válido.');
      return;
    }
    if (!validatePassword(password)) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Informe seu nome completo para se cadastrar.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        // ── Login real via Firebase ──────────────────────────
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const fbUser = cred.user;
        const finalName = fbUser.displayName || email.split('@')[0];
        signIn(finalName, fbUser.email ?? email.trim());
        setSuccess('Login realizado com sucesso!');
      } else {
        // ── Cadastro real via Firebase ───────────────────────
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        const fbUser = cred.user;

        // Atualiza nome no perfil Firebase
        if (name.trim()) {
          await firebaseUpdateProfile(fbUser, { displayName: name.trim() });
        }

        signIn(name.trim() || email.split('@')[0], fbUser.email ?? email.trim());
        setSuccess('Conta criada com sucesso!');
      }
    } catch (err: any) {
      console.error('❌ Firebase Auth error:', err);
      const code = err?.code ?? '';
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  // ── Esqueceu a senha (Firebase REAL) ──────────────────────
  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      setError('Digite um e-mail válido para recuperar sua senha.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        'E-mail enviado',
        `Enviamos um link de redefinição para ${email.trim()}. Verifique sua caixa de entrada.`
      );
    } catch (err: any) {
      const code = err?.code ?? '';
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* ── Cabeçalho ── */}
          <View style={styles.topSection}>
            <Text style={[styles.title, { color: theme.text }]}>Kod Finance</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Organize suas finanças com clareza e foco.
            </Text>
          </View>

          {/* ── Card de Auth ── */}
          <View style={[styles.authCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Toggle login / cadastro */}
            <View style={[styles.modeRow, { backgroundColor: themeMode === 'dark' ? '#1c1c1e' : '#f0f4f8' }]}>
              <TouchableOpacity
                onPress={() => switchMode('login')}
                style={[styles.modeButton, mode === 'login' && { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modeText, mode === 'login' ? styles.modeTextActive : { color: theme.text }]}>
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => switchMode('signup')}
                style={[styles.modeButton, mode === 'signup' && { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modeText, mode === 'signup' ? styles.modeTextActive : { color: theme.text }]}>
                  Cadastrar
                </Text>
              </TouchableOpacity>
            </View>


            {/* Campo nome (somente cadastro) */}
            {mode === 'signup' && (
              <FormField
                icon="account-circle-outline"
                label="Nome completo"
                placeholder="Seu nome"
                value={name}
                onChangeText={setName}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />
            )}

            <FormField
              icon="email-outline"
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.textSecondary}
            />

            <FormField
              icon="lock-outline"
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor={theme.textSecondary}
            />

            {/* Lembrar-me + Esqueceu a senha */}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(prev => !prev)}>
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  {rememberMe && <MaterialIcons name="check" size={14} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.textSecondary }]}>Lembrar-me</Text>
              </TouchableOpacity>

              {mode === 'login' && (
                <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                  <Text style={[styles.forgotText, { color: theme.primary }]}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Feedback */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            {/* Botão principal */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Entrar agora' : 'Criar conta'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divisória OU */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OU</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Botão Google */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                { backgroundColor: themeMode === 'dark' ? '#1c1c1e' : '#f8f9fa', borderColor: theme.border },
              ]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <MaterialCommunityIcons name="google" size={20} color="#ea4335" />
              <Text style={[styles.googleButtonText, { color: theme.text }]}>Continuar com o Google</Text>
            </TouchableOpacity>

            {/* Termos */}
            <Text style={[styles.termsText, { color: theme.textSecondary }]}>
              Ao continuar, você concorda com os{' '}
              <Text style={[styles.linkText, { color: theme.primary }]} onPress={() => setShowTerms(true)}>
                Termos de Uso
              </Text>{' '}
              e{' '}
              <Text style={[styles.linkText, { color: theme.primary }]} onPress={() => setShowTerms(true)}>
                Política de Privacidade
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} theme={theme} />
    </KeyboardAvoidingView>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────
function FormField({ icon, label, secureEntry, ...props }: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = props.secureTextEntry;
  const { themeMode } = useApp();
  const theme = FinanceTheme[themeMode];

  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldInput, { backgroundColor: themeMode === 'dark' ? '#1c1c1e' : '#ffffff', borderColor: theme.border }]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={themeMode === 'dark' ? '#52525b' : '#a1a1aa'}
          {...props}
          secureTextEntry={isPasswordField && !showPassword}
        />
        {isPasswordField && (
          <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function TermsModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: any }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Termos de Uso e Privacidade</Text>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={[styles.modalText, { color: theme.textSecondary }]}>
              Ao usar o Kod Finance, você concorda com o tratamento seguro dos seus dados financeiros.
            </Text>
            <Text style={[styles.modalText, { color: theme.textSecondary }]}>
              Suas informações são armazenadas localmente no dispositivo. O login com Google é processado
              exclusivamente pelo Firebase Authentication, seguindo as políticas de privacidade do Google.
            </Text>
            <Text style={[styles.modalText, { color: theme.textSecondary }]}>
              Nenhum dado financeiro é enviado para servidores externos sem o seu consentimento explícito.
            </Text>
          </ScrollView>
          <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={onClose}>
            <Text style={styles.modalButtonText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Estilos ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  topSection: { marginBottom: 28, alignItems: 'center' },
  title: { fontSize: 34, fontWeight: 'bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center' },

  authCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
  },
  modeButton: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  modeText: { fontSize: 15, fontWeight: '600' },
  modeTextActive: { color: '#fff' },



  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { marginBottom: 7, fontSize: 13, color: '#7b7b7b', fontWeight: '500' },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, minHeight: 38 },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: { fontSize: 13 },
  forgotText: { fontSize: 13, fontWeight: '700' },

  errorText: { color: '#e74c3c', marginBottom: 12, fontSize: 13 },
  successText: { color: '#2ecc71', marginBottom: 12, fontSize: 13 },

  submitButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  termsText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  linkText: { textDecorationLine: 'underline', fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', padding: 24 },
  modalContent: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', maxHeight: '80%' },
  modalTitle: { fontSize: 19, fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 20, paddingTop: 20 },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 16 },
  modalText: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  modalButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', margin: 16 },
  modalButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});