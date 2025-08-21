// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { logoprincipal } from '../config/routes'
import { useAuthStore } from '../config/stores/useAuthStore'
import { loginWithEmail, loginWithGoogle } from '../config/auth'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { session, setSessionFromSupabase, loading, user } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user && session) {
      navigate('/inicio', { replace: true })
    }
  }, [loading, user, session, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setMessage('Completa todos los campos.')
      setIsError(true)
      return
    }

    setIsSubmitting(true)
    const { error, data } = await loginWithEmail(email, password)
    setIsSubmitting(false)

    if (error) {
        setMessage(error.message)
        setIsError(true)
    } else if (data?.session) {
        await setSessionFromSupabase(data.session)
        setMessage('Inicio de sesión exitoso. Redirigiendo...')
        setIsError(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsError(false)
    setIsSubmitting(true)
    const { error } = await loginWithGoogle()
    setIsSubmitting(false)
    if (error) {
      setMessage(error.message)
      setIsError(true)
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('/imgs/bg2_we_sing.svg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          zIndex: 0,
        },
      }}
    >
      <Container
        maxWidth="xs"
        sx={{
          position: 'relative',
          zIndex: 1,
          mt: 18,
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            boxShadow: 3,
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: 'rgba(255,255,255,0.85)',
          }}
        >
          <img
            src={logoprincipal}
            alt="Logo La Singular"
            style={{ maxWidth: '160px', marginBottom: '1rem' }}
          />

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Iniciar sesión
          </Typography>

          <TextField
            label="Correo electrónico"
            type="email"
            name="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Contraseña"
            type="password"
            name="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : 'Entrar'}
          </Button>

          <Button
            onClick={handleGoogleLogin}
            variant="outlined"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              width: '100%',
              mb: 2,
              borderColor: '#ccc',
              textTransform: 'none',
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              style={{ width: 20, height: 20 }}
            />
            Iniciar con Google
          </Button>

          <Link
            href="/recuperar-contrasena"
            underline="hover"
            display="block"
            sx={{ mt: 2, fontSize: '0.875rem' }}
          >
            ¿Olvidaste tu contraseña?
          </Link>

          {message && (
            <Alert severity={isError ? 'error' : 'success'} sx={{ mt: 3 }}>
              {message}
            </Alert>
          )}
        </Box>
      </Container>
    </Box>
  )
}

export default LoginPage
