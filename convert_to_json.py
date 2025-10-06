import gspread
import json
import os
from creds import *
import pandas as pd
import numpy as np



def convert_data(key, countries, years_dict, capacity, statuses_lng, statuses_gas, subregions, tracker):
    client_secret_full_path = os.path.expanduser("~/") + client_secret

    # Set up Google Sheets API credentials
    gspread_creds = gspread.oauth(
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
            credentials_filename=client_secret_full_path,
            # authorized_user_filename=json_token_name,
        )

    gsheets = gspread_creds.open_by_key(key)  
    sheet_names = [sheet.title for sheet in gsheets.worksheets()]
    print(f'This is sheet_names: \n {sheet_names}')
    for sn in sheet_names:
        print(sn)
        data = pd.DataFrame(gsheets.worksheet(sn).get_all_records(expected_headers=[])) # get_all_records(expected_headers=[]) get_all_values()
        data.fillna(0.0, inplace=True)
        data = data.replace("", "0.0")
        if sn in ['25088546', '25088647']:
            capcol = capacity[sn]
            print(f'this is capacity col: {capcol}')
            # Ensure all country-year combinations exist, fill missing with capacity 0.0
            expected_years = years_dict[sn]
            expected_rows = []
            for country in countries:
                for year in expected_years:
                    expected_rows.append({'Country': country, 'Start year': year})

            # Merge with existing data, fill missing capacity with 0.0
            merged = pd.DataFrame(expected_rows)
            data = pd.merge(merged, data, on=['Country', 'Start year'], how='left')
            if capcol in data.columns:
                data[capcol] = data[capcol].fillna(0.0)
            else:
                data[capcol] = 0.0
            
            data.to_json(f'trackers/ggpft-dashboard/public/assets/data_2025/{sn}_ggft_output_filled.json', orient='records', force_ascii=False, indent=2)
            
            
        
        elif sn in ['dataticker']:
            for row in data.index:
                for i in list(range(1,4)):
                    summary_text = data.loc[row, f'summary_{i}']
                    summary_sum = data.loc[row, f'summ{i}data']
                    summary_text = summary_text.replace('placeholder', str(summary_sum))
                    print(f'New summary text: {summary_text}')
                    data.loc[row, f'summary_{i}'] = summary_text
                    
        elif sn in ['25071902','25071855']:
            print(sn)
            print(data)

            # Optionally, save the updated dataframe to JSON
            data.to_json(f'trackers/ggpft-dashboard/public/assets/data_2025/{sn}_ggft_output_filled.json', orient='records', force_ascii=False, indent=2)
        
        elif sn in ['25051331', '25051458']:
            if sn in ['25051331']:
                statuses = statuses_lng
            elif sn in ['25051458']:
                statuses = statuses_gas
            
            print(sn)
            print(data)
            expected_rows = []
            
            capcol = capacity[sn]
            print(f'this is capacity col: {capcol}')
            for country in countries:
                for status in statuses:
                    expected_rows.append({'Country': country, 'Status': status})
            
            # Merge with existing data, fill missing capacity with 0.0
            merged = pd.DataFrame(expected_rows)
            data = pd.merge(merged, data, on=['Country', 'Status'], how='left')
            if capcol in data.columns:
                data[capcol] = data[capcol].fillna(0.0)
            else:
                data[capcol] = 0.0
            
            # summing for all
            # for statusnow in statuses:
            all_rows = data[data['Country']=='All']
            for row in all_rows.index:
                print(all_rows.loc[row,'Status'])
                statusnow = all_rows.loc[row,'Status']
                # Calculate the sum of capacity for the current status (excluding 'All')
                status_mask = (data['Status'] == statusnow) & (data['Country'] != 'All')
                total_capacity = data.loc[status_mask, capcol].sum()
                all_rows.loc[row, capcol] = int(total_capacity)
                
            
    
            # Overwrite the capacity column in data with values from all_rows where Country and Status match
            for idx, row in all_rows.iterrows():
                mask = (data['Country'] == row['Country']) & (data['Status'] == row['Status'])
                data.loc[mask, capcol] = row[capcol]
            
            data.to_json(f'trackers/ggpft-dashboard/public/assets/data_2025/{sn}_ggft_output_filled.json', orient='records', force_ascii=False, indent=2)

        elif sn in ['25052602', '25052730']:   
            capcol = capacity[sn]
            print(f'this is capacity col: {capcol}')
            # Ensure all country-year combinations exist, fill missing with capacity 0.0
            expected_years = years_dict[sn]
            expected_rows = []
            for country in countries:
                for year in expected_years:
                    expected_rows.append({'Country': country, 'Start year': year})
            # this fills in for each country all the years we need
            merged = pd.DataFrame(expected_rows)
            data = pd.merge(
                merged, data, 
                on=['Country', 'Start year'], 
                how='left'
            )
            if capcol in data.columns:
                data[capcol] = data[capcol].fillna(0.0)
            else:
                data[capcol] = 0.0
                
            # now we need to make sure the subregion is copied from the coutnry's subregion for all that are new
            # nullsr = data[data['Subregion'].isna()]
            # for idx, row in data.iterrows():
            #     mask = (nullsr['Country'] == row['Country'])
            #     data.loc[mask, 'Subregion'] = row['Subregion']
            
            # mapping
            
            # Create a mapping from country to subregion (excluding missing subregions)
            country_to_subregion_dict = data.dropna(subset=['Subregion']).drop_duplicates(subset=['Country'])[['Country', 'Subregion']].set_index('Country')['Subregion'].to_dict()
            
            # Assign subregion to rows where it's missing, based on country
            data['Subregion'] = data.apply(
                lambda row: country_to_subregion_dict.get(row['Country'], row['Subregion']) if pd.isna(row['Subregion']) else row['Subregion'],
                axis=1
            )
            
            data.to_json(f'trackers/ggpft-dashboard/public/assets/data_2025/{sn}_ggft_output_filled.json', orient='records', force_ascii=False, indent=2)
                                         
                    
        elif sn in ['Operating bioenergy capacity', 'Bioenergy Capacity by Fuel Type', 'Woody Biomass Operating Capacity']:
            
            snupdated = sn.lower().replace(' ', '_')
            data.to_json(f'trackers/{tracker}-dashboard/public/assets/data_2025/{snupdated}_{tracker}_output_filled.json', orient='records', force_ascii=False, indent=2)
             
        elif sn in ['24825200']:
            
            # make total_capacity column
            # make status column 
            # explode out cap total from pros and op columns appropriately
            print('Whats the breakdown of fuel type within the bioenergy sector?')
        elif sn in ['dataticker_gbpt']:


            # grab entire data file from tab All data
            all = pd.DataFrame(gsheets.worksheet('All data').get_all_records(expected_headers=[])) # get_all_records(expected_headers=[]) get_all_values()

            # go through all countries, create a set of the unique ones
            ca = set(all['Country/Area'].to_list())
            ca.add('World')
            print(ca)
            st = set(all['Status'].to_list())
            # print(ca)
            # print(st)
            # go through all statuses, create a set of unique ones
            # make a df of all operating
            summ1_op_df = all[all['Status']=='operating']
            
            # make a df of all announced + pre con
            summ2_an_df = all[all['Status'].isin(['announced', 'pre-construction'])]
            # make a df of all under con
            summ3_uc_df = all[all['Status']=='construction']
            # then create a dictionary for each summary 1,2,3 (country, summed operating status in that country, summed announced + precon in that country, summed under construction in that country)
            columns = [
                "Country/Area",
                "summary_1",
                "summary_1_color",
                "summary_2",
                "summary_2_color",
                "summary_3",
                "summary_3_color",
                "summ1data",
                "summ2data",
                "summ3data"
            ]
            summary_1gbpt = '<span>{{placeholder}} MW</span><br>operating<br> bioenergy power capacity'
            summary_1_color = '#bf532c'
            summary_2gbpt = '<span>{{placeholder}} MW</span>bioenergy power capacity<br> under development<br>'
            summary_2_color = '#761200'
            summary_3gbpt = '<span>{{placeholder}} MW</span>bioenergy power capacity<br> under construction<br>'
            summary_3_color = '#f27d16'

            # Create a DataFrame with all countries and initialize columns
            data = pd.DataFrame({'Country/Area': list(ca)})
            data['summary_1'] = pd.Series([summary_1gbpt] * len(data))
            data['summary_1_color'] = pd.Series([summary_1_color] * len(data))
            data['summary_2'] = pd.Series([summary_2gbpt] * len(data))
            data['summary_2_color'] = pd.Series([summary_2_color] * len(data))
            data['summary_3'] = pd.Series([summary_3gbpt] * len(data))
            data['summary_3_color'] = pd.Series([summary_3_color] * len(data))
            
            print(data)

            # Calculate sums for each country and status group
            summ1 = summ1_op_df.groupby('Country/Area')['Capacity (MW)'].sum()
            summ2 = summ2_an_df.groupby('Country/Area')['Capacity (MW)'].sum()
            summ3 = summ3_uc_df.groupby('Country/Area')['Capacity (MW)'].sum()

            # Map sums to the dataframe, fill missing with 0.0
            data['summ1data'] = data['Country/Area'].map(summ1).fillna(0.0).round(2)
            data['summ2data'] = data['Country/Area'].map(summ2).fillna(0.0).round(2)
            data['summ3data'] = data['Country/Area'].map(summ3).fillna(0.0).round(2)
            
            # Assign world values
            data.loc[data['Country/Area'] == 'World', 'summ1data'] = summ1_op_df['Capacity (MW)'].sum()
            data.loc[data['Country/Area'] == 'World', 'summ2data'] = summ2_an_df['Capacity (MW)'].sum()
            data.loc[data['Country/Area'] == 'World', 'summ3data'] = summ3_uc_df['Capacity (MW)'].sum()
                        
            # Insert the float value into the placeholder in the summary strings
            for row in data.index:
                data.loc[row, 'summary_1'] = data.loc[row, 'summary_1'].replace('{{placeholder}}', f"{data.loc[row, 'summ1data']:.1f}")
                data.loc[row, 'summary_2'] = data.loc[row, 'summary_2'].replace('{{placeholder}}', f"{data.loc[row, 'summ2data']:.1f}")
                data.loc[row, 'summary_3'] = data.loc[row, 'summary_3'].replace('{{placeholder}}', f"{data.loc[row, 'summ3data']:.1f}")
            
            print(data[data['Country/Area'] == 'World'])            
            snupdated = sn.lower().replace(' ', '_')
            # then fill in this data into the df
            data.to_json(f'trackers/{tracker}-dashboard/public/assets/data_2025/{snupdated}_{tracker}_output_filled.json', orient='records', force_ascii=False, indent=2)
            
    
    sheetdata = gsheets.worksheet(sn) 
    data = pd.DataFrame(sheetdata.get_all_records(expected_headers=[]))
    

    return data




if __name__ == "__main__":
    trackeracro = 'gbpt' #ggpft
    ggft_countries = [
        "All",
        "Bangladesh",
        "Cambodia",
        "Indonesia",
        "Japan",
        "Malaysia",
        "Myanmar",
        "Pakistan",
        "Philippines",
        "Singapore",
        "South Korea",
        "Taiwan",
        "Thailand",
        "Vietnam"
    ]
    subregions = ['South Asia', 'Southeast Asia', 'East Asia', 'Southeast Asia', 'East Asia', 'Southeast Asia']
    years_dict = {'25088546': list(range(2025,2032)),
                  '25088647': list(range(2025, 2042)),
                  '25052602': list(range(2025,2032)),
                  '25052730': list(range(2025, 2042))}
    
    statuses_lng = ['Proposed', 'Construction', 'Shelved/shelved-inferred']
    statuses_gas = ['Announced', 'Pre-construction', 'Construction', 'Shelved/shelved-inferred']

    ggft_key = '19H_FlvKGPrlYokHPcdlDxCY1-Wb5zFxWcKtCeMGcpls'
    gbpt_key = '10iz-Yz_fXq8sbywNQMbOIKgtqUr6FoRKv44kLQI3G9I'
    if trackeracro in ['gbpt']:
        key = gbpt_key
        
    capacity_col = {'25088546': 'capacity (mtpa)',
                    '25088647': 'capacity (MW)',
                    '25051331': 'capacity (mtpa)', 
                    '25051458': 'capacity (MW)',
                    '25052602': 'capacity (mtpa)',
                    '25052730': 'capacity (MW)'}
    
    
    data = convert_data(key, ggft_countries, years_dict, capacity_col, statuses_lng, statuses_gas, subregions, trackeracro)

# dataticker file

# {
#     "Country": "Bangladesh",
#     "summary_1": "<span>{{6.0}} GW</span><br>operating coal<br>power capacity",
#     "summary_1_color": "#bf532c",
#     "summary_2": "<span>+{{5.8}} GW</span><br>operating coal power <br>capacity from 2015",
#     "summary_2_color": "#761200",
#     "summary_3": "<span>{{8.9}} GW</span><br>coal power capacity<br> under development",
#     "summary_3_color": "#f27d16"
# },

