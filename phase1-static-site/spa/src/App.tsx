import { createBrowserRouter, createRoutesFromElements, NavLink, Outlet, Route, RouterProvider } from 'react-router'
import { Home } from './routes/Home'
import { Profile } from './routes/Profile'
import { routes } from './routes'

function App() {
  return <Routing />;
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
