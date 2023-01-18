import {
  createHashRouter, 
  createRoutesFromElements,
  Route, 
  RouterProvider
} from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async';

// pages
import Climat from "./pages/Climat"
import Eau from "./pages/Eau"

import { Outlet, NavLink } from "react-router-dom";
import logo from "./img/sun.svg"

function RootLayout() {
  return (
    <HelmetProvider>

    <div className="pbr-container">
      <header>
        <nav className='pbr-menu'>
          <div className='pbr-menu__logo'>
            <img src={logo} width="30px"/>
          </div>
          <div className='pbr-menu__text'>
            Archives Environnement
          </div>
          <NavLink to="/">Climat</NavLink>    { /* NavLink has an active to know where we are */ }
        </nav>
      </header>
      <main>
        <Outlet />    { /* the page of the Route element is displayed */ }
      </main>
    </div>
    </HelmetProvider>
  )
}

// Use HashRouter instead of BrowserRouter in order to deploy on github pages
// cf. https://www.freecodecamp.org/news/deploy-a-react-app-to-github-pages/
const router = createHashRouter(
  createRoutesFromElements(
    <Route path="/" element={<RootLayout />}>
      <Route index element={<Climat />} />
      <Route path="eau" element={<Eau />} /> 

      { /* TODO: <Route path="*" element={<NotFound />} /> */ }
    </Route>
  )
)

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App
