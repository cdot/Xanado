/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/*
 *  Interactive interface to CheckStrings translations checker
 */

import { CheckStrings } from "../test/CheckStrings.js";
const cs = new CheckStrings(console);
cs.check();
