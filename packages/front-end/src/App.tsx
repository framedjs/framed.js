import * as React from "react";
import './css/App.scss';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";

function App() {
  return (
    <div className="App">
      <Router>
        <Header/>

        <Switch>
          <Route path="/about">
            <AboutPage/>
          </Route>
          <Route path="/">
            <HomePage/>
          </Route>
          
        </Switch>
      </Router>
    </div>
  );
}

export default App;
