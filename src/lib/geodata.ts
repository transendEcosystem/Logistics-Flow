/**
 * Comprehensive South African Industrial and Commercial Geodata
 * Organized by Province > City/Town > Industrial Hubs/Suburbs
 */
export const provinces = [
  { 
    name: 'Gauteng', 
    cities: [
      { 
        name: 'Johannesburg', 
        suburbs: ['City Deep', 'Isando', 'Jet Park', 'Spartan', 'Aeroton', 'Alrode', 'Wadeville', 'Midrand', 'Kempton Park', 'Germiston', 'Boksburg', 'Benoni', 'Roodepoort', 'Selby', 'Ormonde', 'Steeledale', 'Longmeadow'] 
      },
      { 
        name: 'Pretoria', 
        suburbs: ['Rosslyn', 'Silverton', 'Sunderland Ridge', 'Clayville', 'Waltloo', 'Koedoespoort', 'Namanlolo', 'Pretoria West'] 
      },
      {
        name: 'Vaal Triangle',
        suburbs: ['Vanderbijlpark', 'Vereeniging', 'Sasolburg', 'Meyerton']
      },
      {
        name: 'Heidelberg',
        suburbs: ['Heidelberg Industrial', 'N3 Hub']
      }
    ] 
  },
  { 
    name: 'Western Cape', 
    cities: [
      { 
        name: 'Cape Town', 
        suburbs: ['Epping', 'Montague Gardens', 'Paarden Eiland', 'Stikland', 'Blackheath', 'Airport Industria', 'Killarney Gardens', 'Bellville', 'Brackenfell', 'Parow', 'Maitland', 'Salt River', 'Philippi', 'Athlone', 'Brooklyn'] 
      },
      { 
        name: 'George', 
        suburbs: ['George Industria', 'Pacaltsdorp', 'Wilderness', 'Touwriver'] 
      },
      {
        name: 'Paarl',
        suburbs: ['Dal Josafat', 'Charleston Hill', 'Wellington Industrial']
      },
      {
        name: 'Stellenbosch',
        suburbs: ['Plankenbrug', 'Stellenbosch Central']
      },
      {
        name: 'Worcester',
        suburbs: ['Heatlievale', 'Worcester Industrial']
      },
      {
        name: 'Mossel Bay',
        suburbs: ['Voorbaai', 'Saldanha']
      },
      {
        name: 'Vredenburg',
        suburbs: ['Saldanha Bay', 'West Coast Hub']
      },
      {
        name: 'Beaufort West',
        suburbs: ['N1 Logistics Hub']
      },
      {
        name: 'Knysna',
        suburbs: ['Knysna Industrial']
      }
    ] 
  },
  { 
    name: 'KwaZulu-Natal', 
    cities: [
      { 
        name: 'Durban', 
        suburbs: ['Pinetown', 'Westmead', 'Mobeni', 'Prospecton', 'New Germany', 'Phoenix Industrial', 'Springfield', 'Jacobs', 'Clairwood', 'Cato Ridge', 'Maydon Wharf', 'Point'] 
      },
      { 
        name: 'Richards Bay', 
        suburbs: ['Altona', 'Arboretum', 'Richards Bay Port', 'Empangeni'] 
      },
      {
        name: 'Pietermaritzburg',
        suburbs: ['Willowton', 'Mkondeni', 'Camps Drift']
      },
      {
        name: 'Newcastle',
        suburbs: ['Newcastle Industrial', 'Madadeni']
      },
      {
        name: 'Ladysmith',
        suburbs: ['Ladysmith Industrial', 'Danskrans']
      }
    ] 
  },
  { 
    name: 'Eastern Cape', 
    cities: [
      { 
        name: 'Gqeberha (PE)', 
        suburbs: ['Struandale', 'Deal Party', 'Markman', 'Coega IDZ', 'Neave', 'Korsten', 'North End'] 
      },
      { 
        name: 'East London', 
        suburbs: ['West Bank', 'Arcadia', 'Wilsonia', 'Berlin', 'Fort Jackson'] 
      },
      {
        name: 'Kariega (Uitenhage)',
        suburbs: ['Alexander Park', 'Jagtvlakte']
      },
      {
        name: 'Mthatha',
        suburbs: ['Mthatha Industrial', 'Vulindlela']
      }
    ] 
  },
  { 
    name: 'Free State', 
    cities: [
      { 
        name: 'Bloemfontein', 
        suburbs: ['Hamilton', 'Oos-Einde', 'Kimberley Road', 'Bloemdustria'] 
      },
      {
        name: 'Welkom',
        suburbs: ['Welkom Industrial', 'Riebeeckstad']
      },
      {
        name: 'Harrismith',
        suburbs: ['N3 Logistics Hub', 'Hardustria']
      },
      {
        name: 'Kroonstad',
        suburbs: ['Kroonstad Industrial']
      }
    ] 
  },
  {
    name: 'Limpopo',
    cities: [
      {
        name: 'Polokwane',
        suburbs: ['Laboria', 'Ladanna', 'Polokwane North']
      },
      {
        name: 'Musina',
        suburbs: ['Special Economic Zone', 'Beitbridge Hub']
      },
      {
        name: 'Mokopane',
        suburbs: ['Mokopane Industrial']
      },
      {
        name: 'Phalaborwa',
        suburbs: ['Mining Hub']
      }
    ]
  },
  {
    name: 'Mpumalanga',
    cities: [
      {
        name: 'Mbombela (Nelspruit)',
        suburbs: ['Rocky Drift', 'Nelspruit Industrial']
      },
      {
        name: 'eMalahleni (Witbank)',
        suburbs: ['Witbank Industrial', 'Clewer']
      },
      {
        name: 'Middelburg',
        suburbs: ['Middelburg Industrial', 'N11 Hub']
      },
      {
        name: 'Secunda',
        suburbs: ['Sasol Hub', 'Trichardt']
      },
      {
        name: 'Ermelo',
        suburbs: ['Ermelo Industrial']
      }
    ]
  },
  {
    name: 'North West',
    cities: [
      {
        name: 'Rustenburg',
        suburbs: ['Rustenburg Industrial', 'Waterfall']
      },
      {
        name: 'Potchefstroom',
        suburbs: ['Potch Industrial', 'Grimbeek Park']
      },
      {
        name: 'Klerksdorp',
        suburbs: ['Klerksdorp Industrial', 'Uraniaville']
      },
      {
        name: 'Brits',
        suburbs: ['Brits Industrial', 'Oukasie']
      }
    ]
  },
  {
    name: 'Northern Cape',
    cities: [
      {
        name: 'Kimberley',
        suburbs: ['Kimdustria', 'Ashburnham']
      },
      {
        name: 'Upington',
        suburbs: ['Upington Industrial', 'Airport Area']
      },
      {
        name: 'Kathu',
        suburbs: ['Mining Hub']
      }
    ]
  }
];
