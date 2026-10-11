import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { createBrowserRouter, createRoutesFromElements, NavLink, Outlet, Route, RouterProvider } from 'react-router'
import { Home } from './routes/Home'
import { Profile } from './routes/Profile'
import { routes } from './routes'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>
      <Routing />
    </>
  )
}

const Routing = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path={routes.Home} element={<Layout />}>
          <Route index element={<Home />} />
          <Route path={routes.Profile} element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </>
    )
  );

  return <RouterProvider router={router} />;
};

const Layout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <nav>
        <ul>
          <li>
            <NavLink to={routes.Home}>Home</NavLink>
          </li>
          <li>
            <NavLink to={routes.Profile}>Profile</NavLink>
          </li>
        </ul>
      </nav>
      <main style={{ marginLeft: '20px', flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

const NotFound = () => <h1>404 Not Found</h1>;

export default App
